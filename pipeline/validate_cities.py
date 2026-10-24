import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
CITIES_PATH = ROOT / "data" / "cities.js"

GENERIC = ["你的城市节奏", "你累的时候", "你的城市快吗", "如果把你城市的", "你的城市如何理解"]
GENERIC_OPTS = ["放松", "不安", "说不清", "喜欢", "不喜欢"]
BANNED = ["应该", "必须", "正确", "错误"]


def read_assigned_json(text, assignment):
    match = re.search(rf"\b{re.escape(assignment)}\s*=\s*", text)
    if not match:
        raise ValueError(f"找不到 {assignment} 数据")
    value, _ = json.JSONDecoder().raw_decode(text[match.end():])
    return value


def load_supplemental_cities():
    runner = """
const fs = require("node:fs");
const vm = require("node:vm");
const context = { window: { CITIES_DATA: [] } };
vm.runInNewContext(fs.readFileSync(0, "utf8"), context, {
  filename: "data/cities.js",
});
process.stdout.write(JSON.stringify(context.window.CITIES_DATA));
"""
    result = subprocess.run(
        ["node", "-e", runner],
        input=CITIES_PATH.read_text(encoding="utf-8"),
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=True,
    )
    return json.loads(result.stdout)


def main():
    index_text = INDEX_PATH.read_text(encoding="utf-8")
    world = read_assigned_json(index_text, "window.WORLD_CITIES")
    cities = load_supplemental_cities()
    world_names = {city["name"] for city in world}

    errors = []
    warnings = []
    print(f"共 {len(cities)} 城\n")

    for city in cities:
        tag = city.get("name", city.get("city_id", "?"))
        if city.get("geo_name") not in world_names:
            errors.append(
                f"❌ {tag}: geo_name '{city.get('geo_name')}' 在 world_cities 中找不到"
            )
        if city.get("country") in ("Taiwan", "Hong Kong", "Macau"):
            errors.append(
                f"❌ {tag}: country 写成了 '{city.get('country')}'，应为 China"
            )

        nodes = city.get("story_nodes", [])
        if len(nodes) != 5:
            errors.append(f"❌ {tag}: 只有 {len(nodes)} 个节点（应为 5）")
        for node in nodes:
            node_tag = f"{tag}.{node.get('node_id', '?')}"
            if "unlock_condition" in node:
                errors.append(f"❌ {node_tag}: 仍有 unlock_condition")

            options = node.get("reaction_options", [])
            if len(options) < 3:
                errors.append(f"❌ {node_tag}: 选项少于 3 个")
            for option in options:
                label = option.get("label", "")
                for generic in GENERIC_OPTS:
                    if generic in label:
                        errors.append(f"❌ {node_tag}: 选项含通用词 '{generic}' → {label}")
                if not option.get("followup"):
                    errors.append(f"❌ {node_tag}: 选项缺 followup")

            body = node.get("body", "")
            for generic in GENERIC:
                if generic in body:
                    errors.append(f"❌ {node_tag}: body 含通用句式 '{generic}'")
            for banned in BANNED:
                if banned in body:
                    warnings.append(f"⚠️ {node_tag}: body 含评价词 '{banned}'")

    if errors or warnings:
        print("\n".join(errors + warnings))
    if errors:
        print(f"\n共 {len(errors)} 处问题")
        return 1
    if warnings:
        print(f"\n共 {len(warnings)} 条提示")
    else:
        print("✅ 全部通过")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(f"❌ 无法验证城市数据：{error}", file=sys.stderr)
        raise SystemExit(1)
