const hongKongCity = {
  city_id: "hongkong",
  geo_name: "Hong Kong",
  name: "香港",
  name_en: "Hong Kong",
  country: "China",
  rhythm_tags: ["fast", "dense", "coastal", "night-owl", "green"],
  cultural_dimensions: {
    pace: 5,
    social_density: 5,
    nature_proximity: 3,
    tradition_vs_modernity: 4,
    noise_level: 5,
  },
  story_nodes: [
    {
      node_id: "hk_story_01",
      type: "landmark",
      title: "自修室的下午",
      body: "自修室里每个人面前都摊着书，但有一半的人在发呆。冷气很足，有人趴着睡着了，手臂压着一份写满字的模拟卷。近年调查显示，香港学生的焦虑比例持续上升——不只是在考试期间，而是几乎成为一种日常状态。窗外是球场，没有人打球。",
      scene_pos: [22, 28],
      source_note: "香港学生焦虑与DSE压力公开讨论",
      reaction_options: [
        {
          id: "wake",
          label: "我想叫醒他，告诉他可以再睡五分钟",
          followup: "你没有叫。你想起自己也曾被人这样看着，但没有人叫醒你。",
        },
        {
          id: "pretend",
          label: "我想假装没看见，继续看自己的书",
          followup: "你翻了一页，但一个字也没读进去。你听见他呼吸的声音，很轻。",
        },
        {
          id: "same",
          label: "我想我也曾经这样趴着睡着过",
          followup: "你想起了那张卷子上的分数，和当时不敢让任何人看到的眼泪。",
        },
        {
          id: "ask",
          label: "我想知道他睡得够不够，而不是考得好不好",
          followup: "你意识到，这个问题本身就很不香港——连关心都要用分数来表达。",
        },
      ],
    },
    {
      node_id: "hk_story_02",
      type: "local_voice",
      title: "茶餐厅的伙计",
      body: "伙计一边写单一边说：'我哋呢度唔兴等，但你叫咗嘢食，我一定会记得。'他把奶茶放下，杯底垫着一张撕了一半的单。你发现他记得每一个熟客叫什么，但从不问'你最近点啊'。这种'记得但不问'的距离，在香港的快节奏里，反而成了一种温柔。",
      scene_pos: [68, 40],
      source_note: "香港茶餐厅文化与人情味",
      reaction_options: [
        {
          id: "sit",
          label: "我想坐下来，听他和熟客聊天",
          followup: "你坐下来。他问你'照旧？'，你点头。原来被记得，是一件很轻的事。",
        },
        {
          id: "watch",
          label: "我想知道他怎么记住这么多人的",
          followup: "他说：'做久了就记得啦，唔使特登记。'你发现，有些东西是自然留下的。",
        },
        {
          id: "memory",
          label: "我想到了自己楼下那家店",
          followup: "你想起楼下那家便利店，店员也记得你。但你已经很久没去了。",
        },
        {
          id: "order",
          label: "我想点一杯和他一样的奶茶",
          followup: "你点了一杯。奶茶很烫，你喝得很慢。伙计没有催你。",
        },
      ],
    },
    {
      node_id: "hk_story_03",
      type: "rhythm",
      title: "天星小轮的十分钟",
      body: "船开得很慢。身边的人都在看手机，但船身的摇晃让所有人不自觉地一起微微倾斜。海风很咸。你忽然发现，这十分钟里，整座城市的节奏被强行调慢了。维港的两岸在暮色里慢慢后退，这是香港少数'不会因为你赶时间就开快一点'的地方。",
      scene_pos: [45, 72],
      source_note: "天星小轮与维港海滨空间",
      reaction_options: [
        {
          id: "phone",
          label: "我也拿出了手机，但不知道要看什么",
          followup: "你滑了两下，又放下了。海风把屏幕吹得有点反光。",
        },
        {
          id: "look",
          label: "我决定这十分钟不看手机",
          followup: "你看海。海是灰绿色的，有一艘货船在很远的地方慢慢移动。",
        },
        {
          id: "notice",
          label: "我想观察车厢里的人各自看向哪里",
          followup: "你发现，这是你今天第一次看到这么多不皱眉的脸。",
        },
        {
          id: "count",
          label: "我在数船靠岸还要多久",
          followup: "你数到第七次摇晃，船就靠岸了。十分钟比你想的短。",
        },
      ],
    },
    {
      node_id: "hk_story_04",
      type: "local_voice",
      title: "街市收工时分",
      body: "街市快要收档，菜贩把卖剩的菜一扎一扎地装进胶袋，便宜卖给最后几个客人。有人蹲下来挑，有人只是聊天。灯光很黄，地板很湿。这是一天里最不赶的时候——摊贩之间会互相问今天卖了多少，也会帮隔壁摊位收拾。",
      scene_pos: [18, 58],
      source_note: "香港街市社区温暖",
      reaction_options: [
        {
          id: "buy",
          label: "我想买一袋便宜菜",
          followup: "你买了一袋菜心。老板说'够啦，唔收你钱'，然后硬塞了一把葱。",
        },
        {
          id: "listen",
          label: "我想站在旁边听他们聊天",
          followup: "你听到他们说今天卖剩多少、明天要不要多进一些。那种对话，像是一天结束前的小小总结。",
        },
        {
          id: "walk",
          label: "我想很快走过",
          followup: "你走过了，但身后传来笑声。你脚步慢了一点。",
        },
        {
          id: "watch",
          label: "我想看他们怎么收拾",
          followup: "一个人把菜叶扫到角落，另一个人递给他一瓶水。没有说话。",
        },
      ],
    },
    {
      node_id: "hk_story_05",
      type: "hidden",
      title: "唐楼的天台",
      body: "推开一扇生锈的铁门，天台上有几盆没人打理的植物，一张塑胶凳，还有晾着的衣服在风里翻动。远处是密不透光的楼。香港的地少人多，但这座城市里，总有人在天台找到属于自己的一小块空间。你站在这里，忽然觉得整座城市安静得不真实。",
      scene_pos: [82, 22],
      source_note: "香港唐楼天台空间",
      reaction_options: [
        {
          id: "sit",
          label: "我想在这里坐一会儿",
          followup: "你坐了下来。风吹过来，晾着的衣服轻轻碰在一起，发出很轻的声音。",
        },
        {
          id: "who",
          label: "我想知道是谁种的这些植物",
          followup: "你看到花盆上有一张褪色的便利贴，写着'浇少少水就得'。字迹很旧了。",
        },
        {
          id: "photo",
          label: "我想拍下来",
          followup: "你拿出手机，但又放下了。有些东西，拍下来反而不见了。",
        },
        {
          id: "quiet",
          label: "我只是想安静一下",
          followup: "你闭上眼睛。城市的声音还在，但好像隔了一层。",
        },
      ],
    },
  ],
  session_end_note: "你走完了香港的五段故事。现在可以合上游戏，去看看你窗外真实的城市。",
};

if (!Array.isArray(window.CITIES_DATA)) {
  throw new Error("City data must be available before loading data/cities.js.");
}

window.CITIES_DATA = [
  ...window.CITIES_DATA.filter((city) => city.city_id !== hongKongCity.city_id),
  hongKongCity,
];
