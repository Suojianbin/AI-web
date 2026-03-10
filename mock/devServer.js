import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
}

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8'
}

const createTimestamp = (offsetMinutes = 0) =>
  new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString()

const clone = (value) => JSON.parse(JSON.stringify(value))

const createToolSpec = (id, name, description) => ({
  id,
  name,
  description
})

const createInitialState = () => {
  const departments = [
    {
      id: 1,
      name: '平台研发',
      description: '负责 Yuxi-Know 平台研发与维护',
      user_count: 1
    },
    {
      id: 2,
      name: '知识工程',
      description: '负责知识库运营与内容治理',
      user_count: 1
    }
  ]

  const users = [
    {
      id: 1,
      user_id: 'admin',
      username: '演示管理员',
      password: 'admin123',
      role: 'superadmin',
      phone_number: '13800000000',
      avatar: '/avatar.jpg',
      department_id: 1,
      department_name: '平台研发',
      created_at: createTimestamp(-60 * 24 * 7)
    },
    {
      id: 2,
      user_id: 'analyst',
      username: '知识分析员',
      password: 'analyst123',
      role: 'admin',
      phone_number: '13900000000',
      avatar: '',
      department_id: 2,
      department_name: '知识工程',
      created_at: createTimestamp(-60 * 24 * 3)
    }
  ]

  const agentToolOptions = [
    createToolSpec('knowledge_base', '知识库检索', '检索知识库中的结构化和非结构化内容'),
    createToolSpec('knowledge_graph', '知识图谱查询', '查询实体、关系和图谱路径'),
    createToolSpec('web_search', '联网搜索', '从公开网络补充最新信息'),
    createToolSpec('todo_list', '任务规划', '拆解任务并生成执行计划'),
    createToolSpec('write_file', '写入文件', '将结构化结果写入工作区文件'),
    createToolSpec('calculator', '计算器', '执行基础数学计算')
  ]

  const agents = [
    {
      id: 'knowledge-assistant',
      name: '知识助理',
      description: '适合知识问答、文档总结和资料归纳。',
      capabilities: ['file_upload', 'todo', 'files'],
      examples: ['总结一下系统能力', '帮我规划一个知识库搭建方案', '现在有哪些示例知识库？'],
      has_checkpointer: true
    },
    {
      id: 'graph-analyst',
      name: '图谱分析师',
      description: '侧重图谱实体关系检索和路径分析。',
      capabilities: ['todo', 'files'],
      examples: ['展示一下图谱中的关键实体', '帮我分析关系网络'],
      has_checkpointer: true
    },
    {
      id: 'report-writer',
      name: '报告助手',
      description: '适合生成报告、纪要和知识卡片。',
      capabilities: ['file_upload', 'files'],
      examples: ['帮我写一份项目周报', '把当前资料整理成提纲'],
      has_checkpointer: true
    }
  ]

  const agentDetails = Object.fromEntries(
    agents.map((agent) => [
      agent.id,
      {
        ...agent,
        configurable_items: {
          system_prompt: {
            label: '系统提示词',
            description: '定义智能体默认行为。',
            template_metadata: { kind: 'text' }
          },
          model: {
            label: '对话模型',
            description: '当前智能体使用的默认模型。',
            template_metadata: { kind: 'llm' }
          },
          tools: {
            label: '可用工具',
            description: '勾选本智能体允许调用的工具。',
            type: 'list',
            options: agentToolOptions,
            template_metadata: { kind: 'tools' }
          },
          temperature: {
            label: '温度',
            description: '控制输出随机性。',
            type: 'number',
            template_metadata: { kind: 'number' }
          }
        }
      }
    ])
  )

  const agentConfigs = {
    'knowledge-assistant': {
      system_prompt: '你是一个稳健的企业知识助理，优先基于知识库给出答案。',
      model: 'openai/gpt-4o-mini',
      tools: ['knowledge_base', 'knowledge_graph', 'todo_list'],
      temperature: 0.3
    },
    'graph-analyst': {
      system_prompt: '你擅长分析实体关系和图谱结构。',
      model: 'deepseek/deepseek-chat',
      tools: ['knowledge_graph', 'calculator'],
      temperature: 0.2
    },
    'report-writer': {
      system_prompt: '你负责把复杂信息整理成清晰的报告。',
      model: 'openai/gpt-4o-mini',
      tools: ['knowledge_base', 'write_file'],
      temperature: 0.4
    }
  }

  const lightDbId = 'kb-demo-light'
  const milvusDbId = 'kb-demo-milvus'

  const databases = {
    [lightDbId]: {
      db_id: lightDbId,
      name: '演示知识图谱库',
      description: '用于演示 LightRAG 检索、图谱和思维导图能力。',
      kb_type: 'lightrag',
      created_at: createTimestamp(-60 * 24 * 2),
      embed_info: {
        name: 'bge-m3',
        dimension: 1024
      },
      llm_info: {
        provider: 'openai',
        model_name: 'gpt-4o-mini'
      },
      additional_params: {
        auto_generate_questions: true
      },
      files: {
        'folder-guide': {
          file_id: 'folder-guide',
          filename: '产品资料',
          is_folder: true,
          parent_id: null,
          status: 'done',
          created_at: createTimestamp(-60 * 24 * 2),
          updated_at: createTimestamp(-60 * 24 * 2)
        },
        'doc-light-1': {
          file_id: 'doc-light-1',
          filename: '平台简介.md',
          is_folder: false,
          parent_id: 'folder-guide',
          status: 'indexed',
          created_at: createTimestamp(-60 * 24 * 2),
          updated_at: createTimestamp(-60 * 24 * 2 + 5),
          file_size: 2048,
          source_path: '/mock-files/平台简介.md',
          content:
            'Yuxi-Know 是一个结合 RAG 与知识图谱能力的智能知识平台，适合企业私有知识管理。',
          lines: [
            'Yuxi-Know 是一个结合 RAG 与知识图谱能力的智能知识平台。',
            '平台支持智能体、知识库、知识图谱和仪表盘能力。'
          ]
        },
        'doc-light-2': {
          file_id: 'doc-light-2',
          filename: '架构设计.pdf',
          is_folder: false,
          parent_id: null,
          status: 'parsed',
          created_at: createTimestamp(-60 * 12),
          updated_at: createTimestamp(-60 * 10),
          file_size: 1048576,
          source_path: '/mock-files/架构设计.pdf',
          content: '该文档描述了 LangGraph + Vue + FastAPI + LightRAG 的整体架构。',
          lines: [
            '架构核心包括前端控制台、后端服务、向量检索与知识图谱。',
            '系统通过统一配置管理模型、知识库和图谱。'
          ]
        }
      }
    },
    [milvusDbId]: {
      db_id: milvusDbId,
      name: '演示向量知识库',
      description: '用于演示 Milvus 检索、RAG 评估和文件管理。',
      kb_type: 'milvus',
      created_at: createTimestamp(-60 * 24 * 5),
      embed_info: {
        name: 'text-embedding-3-small',
        dimension: 1536
      },
      llm_info: {
        provider: 'deepseek',
        model_name: 'deepseek-chat'
      },
      additional_params: {
        auto_generate_questions: false
      },
      files: {
        'doc-milvus-1': {
          file_id: 'doc-milvus-1',
          filename: '部署指南.txt',
          is_folder: false,
          parent_id: null,
          status: 'indexed',
          created_at: createTimestamp(-60 * 24 * 5),
          updated_at: createTimestamp(-60 * 24 * 5 + 10),
          file_size: 4096,
          source_path: '/mock-files/部署指南.txt',
          content:
            '部署指南介绍了如何通过 pnpm 和 Docker Compose 启动前后端服务，并配置必要环境变量。',
          lines: [
            '使用 pnpm 安装依赖后，可以通过 pnpm dev 本地启动前端。',
            '通过 Docker Compose 可以启动完整开发环境。'
          ]
        }
      }
    }
  }

  const threads = {
    'knowledge-assistant': [
      {
        id: 'thread-demo-1',
        agent_id: 'knowledge-assistant',
        title: '平台能力速览',
        description: '',
        created_at: createTimestamp(-60 * 6),
        updated_at: createTimestamp(-60 * 6 + 8),
        messages: [
          {
            id: 'msg-human-1',
            type: 'human',
            content: '这个平台主要提供哪些能力？',
            created_at: createTimestamp(-60 * 6)
          },
          {
            id: 'msg-ai-1',
            type: 'ai',
            content:
              '平台主要包含智能体对话、知识库管理、知识图谱分析和运营仪表盘四部分能力。',
            created_at: createTimestamp(-60 * 6 + 1),
            tool_calls: []
          }
        ],
        attachments: [],
        agent_state: {
          todos: [
            { title: '梳理产品能力', done: true },
            { title: '整理页面入口', done: false }
          ],
          files: [
            {
              summary: {
                name: '平台简介.md',
                path: '/mock-files/平台简介.md'
              }
            }
          ]
        }
      }
    ],
    'graph-analyst': [],
    'report-writer': []
  }

  const feedbacks = [
    {
      id: 1,
      message_id: 'msg-ai-1',
      rating: 'like',
      reason: '回答结构清晰',
      username: '演示管理员',
      avatar: '/avatar.jpg',
      conversation_title: '平台能力速览',
      message_content: '平台主要包含智能体对话、知识库管理、知识图谱分析和运营仪表盘四部分能力。',
      created_at: createTimestamp(-60 * 5),
      agent_id: 'knowledge-assistant'
    },
    {
      id: 2,
      message_id: 'msg-ai-2',
      rating: 'dislike',
      reason: '希望补充更多实现细节',
      username: '知识分析员',
      avatar: '',
      conversation_title: '知识库最佳实践',
      message_content: '建议先按业务域拆分知识库，再分别设置检索参数和图谱能力。',
      created_at: createTimestamp(-60 * 3),
      agent_id: 'report-writer'
    }
  ]

  const tasks = [
    {
      id: 'task-seed-1',
      name: '演示数据初始化',
      type: 'system',
      status: 'success',
      progress: 100,
      message: 'Mock 数据已准备就绪',
      created_at: createTimestamp(-60 * 2),
      updated_at: createTimestamp(-60 * 2 + 1),
      started_at: createTimestamp(-60 * 2),
      completed_at: createTimestamp(-60 * 2 + 1),
      payload: {},
      result: { initialized: true }
    }
  ]

  const queryParams = {
    [lightDbId]: {
      options: [
        {
          key: 'top_k',
          label: '返回数量',
          type: 'number',
          default: 5,
          min: 1,
          max: 20
        },
        {
          key: 'hybrid_search',
          label: '混合检索',
          type: 'boolean',
          default: true
        },
        {
          key: 'query_mode',
          label: '查询模式',
          type: 'select',
          default: 'hybrid',
          options: [
            { label: '混合检索', value: 'hybrid' },
            { label: '图谱优先', value: 'graph' },
            { label: '向量优先', value: 'vector' }
          ]
        }
      ]
    },
    [milvusDbId]: {
      options: [
        {
          key: 'top_k',
          label: '返回数量',
          type: 'number',
          default: 5,
          min: 1,
          max: 20
        },
        {
          key: 'rerank',
          label: '启用重排序',
          type: 'boolean',
          default: true
        },
        {
          key: 'score_threshold',
          label: '相似度阈值',
          type: 'number',
          default: 0.35,
          min: 0,
          max: 1
        }
      ]
    }
  }

  const sampleQuestions = {
    [lightDbId]: ['这个平台支持哪些主要模块？', '图谱能力适合什么场景？', '如何开始配置知识库？'],
    [milvusDbId]: ['如何本地启动 web 前端？', 'Milvus 知识库适合什么类型的检索？']
  }

  const mindmaps = {
    [lightDbId]: {
      content: 'Yuxi-Know',
      children: [
        {
          content: '核心模块',
          children: [
            { content: '智能体' },
            { content: '知识库' },
            { content: '知识图谱' },
            { content: '仪表盘' }
          ]
        },
        {
          content: '技术栈',
          children: [{ content: 'Vue' }, { content: 'FastAPI' }, { content: 'LangGraph' }]
        }
      ]
    }
  }

  const graphSubgraphs = {
    neo4j: {
      nodes: [
        { id: 'platform', name: 'Yuxi-Know', type: 'platform' },
        { id: 'rag', name: 'RAG', type: 'capability' },
        { id: 'kg', name: 'Knowledge Graph', type: 'capability' },
        { id: 'vue', name: 'Vue.js', type: 'tech' }
      ],
      edges: [
        { id: 'e1', source_id: 'platform', target_id: 'rag', type: 'supports' },
        { id: 'e2', source_id: 'platform', target_id: 'kg', type: 'supports' },
        { id: 'e3', source_id: 'platform', target_id: 'vue', type: 'frontend' }
      ]
    },
    [lightDbId]: {
      nodes: [
        { id: 'n1', name: '知识库', type: 'module', file_path: '/mock-files/平台简介.md' },
        { id: 'n2', name: '知识图谱', type: 'module', file_path: '/mock-files/架构设计.pdf' },
        { id: 'n3', name: '智能体', type: 'module', file_path: '/mock-files/平台简介.md' }
      ],
      edges: [
        {
          id: 'l1',
          source_id: 'n1',
          target_id: 'n2',
          type: 'connects',
          file_path: '/mock-files/平台简介.md'
        },
        {
          id: 'l2',
          source_id: 'n3',
          target_id: 'n1',
          type: 'uses',
          file_path: '/mock-files/架构设计.pdf'
        }
      ]
    },
    [milvusDbId]: {
      nodes: [
        { id: 'm1', name: 'Milvus', type: 'vector_db' },
        { id: 'm2', name: 'Embedding Model', type: 'model' }
      ],
      edges: [{ id: 'm-edge', source_id: 'm2', target_id: 'm1', type: 'writes_to' }]
    }
  }

  const benchmarks = {
    [milvusDbId]: [
      {
        benchmark_id: 'benchmark-demo-1',
        name: '部署问答基准',
        description: '覆盖部署、安装和配置相关的问答样本。',
        question_count: 6,
        created_at: createTimestamp(-60 * 24),
        updated_at: createTimestamp(-60 * 23),
        questions: [
          {
            question: '如何本地启动 web 前端？',
            answer: '进入 web 目录后执行 pnpm install 和 pnpm dev。',
            context: '前端可在 web 目录通过 pnpm 启动。',
            reference_answer: '进入 web 目录执行 pnpm install，然后 pnpm dev。'
          },
          {
            question: 'Docker Compose 适合做什么？',
            answer: '用于启动完整开发环境。',
            context: '可通过 Docker Compose 启动 api 与其他依赖。',
            reference_answer: 'Docker Compose 用于一键启动完整开发环境。'
          },
          {
            question: 'Milvus 知识库适合什么场景？',
            answer: '适合向量检索与 RAG 评估。',
            context: 'Milvus 型知识库主要用于向量召回。',
            reference_answer: 'Milvus 适合向量检索、重排序和 RAG 评估。'
          }
        ]
      }
    ]
  }

  const evaluations = {
    [milvusDbId]: [
      {
        task_id: 'eval-demo-1',
        status: 'success',
        started_at: createTimestamp(-60 * 10),
        completed_at: createTimestamp(-60 * 8),
        total_questions: 3,
        completed_questions: 3,
        overall_score: 0.86,
        retrieval_config: {
          top_k: 5,
          rerank: true
        },
        results: [
          {
            question: '如何本地启动 web 前端？',
            expected_answer: '进入 web 目录执行 pnpm install 和 pnpm dev。',
            retrieved_chunks: ['部署指南.txt'],
            answer: '进入 web 目录执行 pnpm install 后，再运行 pnpm dev。',
            metrics: {
              score: 0.95,
              recall_at_5: 1,
              precision_at_5: 0.8,
              ndcg: 0.92
            }
          },
          {
            question: 'Docker Compose 适合做什么？',
            expected_answer: '用于启动完整开发环境。',
            retrieved_chunks: ['部署指南.txt'],
            answer: '它适合一键启动完整开发环境。',
            metrics: {
              score: 0.88,
              recall_at_5: 1,
              precision_at_5: 0.75,
              ndcg: 0.85
            }
          },
          {
            question: 'Milvus 知识库适合什么场景？',
            expected_answer: '适合向量检索与 RAG 评估。',
            retrieved_chunks: ['部署指南.txt'],
            answer: 'Milvus 更适合做向量检索和评估。',
            metrics: {
              score: 0.75,
              recall_at_5: 0.8,
              precision_at_5: 0.7,
              ndcg: 0.78
            }
          }
        ]
      }
    ]
  }

  return {
    nextUserId: 3,
    nextDepartmentId: 3,
    nextTaskId: 2,
    nextFeedbackId: 3,
    nextUploadedFileId: 1,
    users,
    departments,
    tokens: new Map(),
    infoConfig: {
      organization: {
        name: '江南语析',
        logo: '/favicon.svg',
        avatar: '/avatar.jpg',
        login_bg: '/login-bg.jpg'
      },
      branding: {
        name: 'Yuxi-Know',
        title: 'Yuxi-Know 独立前端演示',
        subtitle: '无需后端即可体验主要页面与交互',
        description: '当前由 Vite 开发期 mock 服务提供基础数据与操作反馈'
      },
      features: [
        {
          label: '独立运行',
          value: 'pnpm dev',
          description: '仅在 web 目录安装依赖即可启动',
          icon: 'stars'
        },
        {
          label: 'Mock 覆盖',
          value: '核心页面',
          description: '聊天、知识库、图谱、仪表盘均可直接体验',
          icon: 'issues'
        },
        {
          label: '最小改动',
          value: 'Vite 层',
          description: '优先不改业务源码，只在开发链路接入 mock',
          icon: 'commits'
        }
      ],
      actions: [
        {
          name: '项目仓库',
          icon: 'github',
          url: 'https://github.com/xerrors/Yuxi-Know'
        },
        {
          name: '项目文档',
          icon: 'docs',
          url: 'https://xerrors.github.io/Yuxi-Know/'
        }
      ],
      footer: {
        copyright: '© 江南语析 2026 mock web standalone'
      }
    },
    config: {
      default_model: 'openai/gpt-4o-mini',
      fast_model: 'deepseek/deepseek-chat',
      embed_model: 'bge-m3',
      reranker: 'bge-reranker-v2-m3',
      enable_content_guard: true,
      enable_content_guard_llm: false,
      content_guard_llm_model: 'openai/gpt-4o-mini',
      embed_model_names: {
        'bge-m3': { dimension: 1024 },
        'text-embedding-3-small': { dimension: 1536 }
      },
      reranker_names: {
        'bge-reranker-v2-m3': { name: 'BGE Reranker' },
        'gte-reranker': { name: 'GTE Reranker' }
      },
      model_provider_status: {
        openai: true,
        deepseek: true,
        siliconcloud: false
      },
      model_names: {
        openai: {
          name: 'OpenAI',
          env: 'OPENAI_API_KEY',
          url: 'https://platform.openai.com',
          models: ['gpt-4o-mini', 'gpt-4.1-mini']
        },
        deepseek: {
          name: 'DeepSeek',
          env: 'DEEPSEEK_API_KEY',
          url: 'https://platform.deepseek.com',
          models: ['deepseek-chat', 'deepseek-reasoner']
        },
        siliconcloud: {
          name: 'SiliconCloud',
          env: 'SILICONFLOW_API_KEY',
          url: 'https://cloud.siliconflow.cn',
          models: []
        },
        internal_proxy: {
          name: '内部代理',
          env: 'INTERNAL_PROXY_KEY',
          url: 'https://example.com/docs',
          models: ['proxy-chat-1'],
          custom: true,
          base_url: 'https://example.com/v1',
          default: 'proxy-chat-1'
        }
      },
      _config_items: {
        default_model: { des: '默认对话模型' },
        fast_model: { des: '快速模型' },
        embed_model: { des: '嵌入模型' },
        reranker: { des: '重排序模型' },
        enable_content_guard: { des: '启用内容审查' },
        enable_content_guard_llm: { des: '启用 LLM 二次审查' },
        content_guard_llm_model: { des: '审查模型' }
      }
    },
    customProviders: {
      internal_proxy: {
        provider_id: 'internal_proxy',
        name: '内部代理',
        base_url: 'https://example.com/v1',
        default: 'proxy-chat-1',
        env: 'INTERNAL_PROXY_KEY',
        models: ['proxy-chat-1'],
        url: 'https://example.com/docs'
      }
    },
    mcpServers: [
      {
        name: 'yuxi-docs',
        description: '项目文档查询服务',
        transport: 'streamable_http',
        url: 'https://example.com/mcp/docs',
        headers: null,
        timeout: 30,
        sse_read_timeout: null,
        tags: ['docs', 'search'],
        icon: '📚',
        enabled: true,
        created_by: 'system',
        created_at: createTimestamp(-60 * 24),
        updated_at: createTimestamp(-60 * 24)
      },
      {
        name: 'local-shell',
        description: '本地脚本执行代理',
        transport: 'stdio',
        url: null,
        command: 'node',
        args: ['server.js'],
        headers: null,
        timeout: null,
        sse_read_timeout: null,
        tags: ['local'],
        icon: '🛠',
        enabled: false,
        created_by: 'admin',
        created_at: createTimestamp(-60 * 6),
        updated_at: createTimestamp(-60 * 6)
      }
    ],
    mcpTools: {
      'yuxi-docs': [
        {
          id: 'docs_search',
          name: 'docs_search',
          description: '检索项目文档内容',
          enabled: true,
          parameters: {
            query: {
              type: 'string',
              description: '搜索关键词'
            }
          },
          required: ['query']
        }
      ],
      'local-shell': [
        {
          id: 'run_script',
          name: 'run_script',
          description: '执行受控脚本',
          enabled: false,
          parameters: {
            script: {
              type: 'string',
              description: '脚本名称'
            }
          },
          required: ['script']
        }
      ]
    },
    agents,
    agentDetails,
    agentConfigs,
    defaultAgentId: 'knowledge-assistant',
    databases,
    threads,
    feedbacks,
    tasks,
    queryParams,
    sampleQuestions,
    mindmaps,
    graphSubgraphs,
    neo4jInfo: {
      status: 'open',
      entity_count: 4,
      relationship_count: 3,
      unindexed_node_count: 2,
      embed_model_name: 'bge-m3',
      embed_model_configurable: true
    },
    benchmarks,
    evaluations
  }
}

const state = createInitialState()

const summarizeTaskList = (tasks) => {
  const statusCounts = {}
  const typeCounts = {}
  for (const task of tasks) {
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
    typeCounts[task.type] = (typeCounts[task.type] || 0) + 1
  }
  return {
    total: tasks.length,
    filtered_total: tasks.length,
    status_counts: statusCounts,
    type_counts: typeCounts
  }
}

const buildUserPayload = (user) => ({
  id: user.id,
  user_id: user.user_id,
  username: user.username,
  phone_number: user.phone_number || '',
  avatar: user.avatar || '',
  role: user.role,
  department_id: user.department_id || null,
  department_name: user.department_name || '',
  created_at: user.created_at
})

const buildTokenPayload = (user, token) => ({
  access_token: token,
  token_type: 'bearer',
  user_id: user.id,
  user_id_login: user.user_id,
  username: user.username,
  phone_number: user.phone_number || '',
  avatar: user.avatar || '',
  role: user.role,
  department_id: user.department_id || null,
  department_name: user.department_name || ''
})

const createTask = (name, type, message, payload = {}) => {
  const id = `task-${state.nextTaskId++}`
  const createdAt = createTimestamp()
  const task = {
    id,
    name,
    type,
    status: 'success',
    progress: 100,
    message,
    created_at: createdAt,
    updated_at: createdAt,
    started_at: createdAt,
    completed_at: createdAt,
    payload,
    result: payload
  }
  state.tasks.unshift(task)
  return task
}

const parseJsonSafely = (text) => {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

const getMultipartBoundary = (contentType = '') => {
  const match = contentType.match(/boundary=(.+)$/i)
  return match ? match[1] : ''
}

const parseMultipart = (rawBody, boundary) => {
  if (!rawBody || !boundary) {
    return { fields: {}, files: [] }
  }

  const text = rawBody.toString('utf8')
  const segments = text.split(`--${boundary}`)
  const fields = {}
  const files = []

  for (const segment of segments) {
    if (!segment || segment === '--\r\n' || segment === '--') continue
    const cleaned = segment.replace(/^\r\n/, '').replace(/\r\n$/, '')
    const [rawHeaders, ...rest] = cleaned.split('\r\n\r\n')
    if (!rawHeaders || rest.length === 0) continue
    const body = rest.join('\r\n\r\n').replace(/\r\n$/, '')
    const dispositionLine = rawHeaders
      .split('\r\n')
      .find((line) => line.toLowerCase().startsWith('content-disposition'))
    if (!dispositionLine) continue

    const nameMatch = dispositionLine.match(/name="([^"]+)"/)
    const filenameMatch = dispositionLine.match(/filename="([^"]*)"/)
    const fieldName = nameMatch ? nameMatch[1] : ''
    if (!fieldName) continue

    if (filenameMatch) {
      files.push({
        fieldName,
        filename: filenameMatch[1],
        content: body
      })
      continue
    }

    fields[fieldName] = body
  }

  return { fields, files }
}

const readRequestBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const parseRequestBody = async (req) => {
  const rawBody = await readRequestBody(req)
  const contentType = req.headers['content-type'] || ''

  if (contentType.includes('application/json')) {
    return parseJsonSafely(rawBody.toString('utf8'))
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')).entries())
  }

  if (contentType.includes('multipart/form-data')) {
    const boundary = getMultipartBoundary(contentType)
    return parseMultipart(rawBody, boundary)
  }

  return rawBody.length ? rawBody.toString('utf8') : {}
}

const getDepartmentName = (departmentId) => {
  const department = state.departments.find((item) => item.id === departmentId)
  return department?.name || ''
}

const requireAuthUser = (req, { admin = false, superadmin = false } = {}) => {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const userId = state.tokens.get(token)

  if (!userId) {
    return { error: { status: 401, body: { detail: '未授权，请先登录' } } }
  }

  const user = state.users.find((item) => item.id === userId)
  if (!user) {
    return { error: { status: 401, body: { detail: '登录状态失效' } } }
  }

  if (superadmin && user.role !== 'superadmin') {
    return { error: { status: 403, body: { detail: '需要超级管理员权限' } } }
  }

  if (admin && user.role !== 'admin' && user.role !== 'superadmin') {
    return { error: { status: 403, body: { detail: '需要管理员权限' } } }
  }

  return { user, token }
}

const findThreadById = (threadId) => {
  for (const threadList of Object.values(state.threads)) {
    const thread = threadList.find((item) => item.id === threadId)
    if (thread) return thread
  }
  return null
}

const buildDatabaseSummary = (database) => ({
  db_id: database.db_id,
  name: database.name,
  description: database.description,
  kb_type: database.kb_type,
  created_at: database.created_at,
  embed_info: clone(database.embed_info),
  files: clone(database.files),
  metadata: {
    is_private: false
  }
})

const buildDatabaseDetail = (database) => ({
  ...buildDatabaseSummary(database),
  llm_info: clone(database.llm_info),
  additional_params: clone(database.additional_params)
})

const createSourcePath = (filename) => `/mock-files/${encodeURIComponent(filename)}`

const createUploadedFile = (filename, parentId = null, status = 'uploaded') => {
  const fileId = `uploaded-${state.nextUploadedFileId++}`
  const createdAt = createTimestamp()
  const sourcePath = createSourcePath(filename)
  return {
    file_id: fileId,
    filename,
    is_folder: false,
    parent_id: parentId,
    status,
    created_at: createdAt,
    updated_at: createdAt,
    file_size: 2048,
    source_path: sourcePath,
    content: `${filename} 的 mock 内容，便于独立前端模式下演示文件流程。`,
    lines: [
      `${filename} 的 mock 内容，便于独立前端模式下演示文件流程。`,
      '你可以继续执行解析、入库和检索测试。'
    ]
  }
}

const ensureDatabase = (dbId) => state.databases[dbId]

const updateDepartmentCounts = () => {
  for (const department of state.departments) {
    department.user_count = state.users.filter((user) => user.department_id === department.id).length
  }
}

const toConversationItem = (thread) => ({
  thread_id: thread.id,
  title: thread.title,
  user_id: 'admin',
  message_count: thread.messages.length,
  status: 'active',
  updated_at: thread.updated_at
})

const createChatAnswer = (query, agentId) => {
  const lower = query.toLowerCase()
  if (lower.includes('知识库')) {
    return '当前 mock 环境下已经提供两个示例知识库，支持文件管理、检索测试和评估演示。'
  }
  if (lower.includes('图谱')) {
    return '图谱页已接入 mock 数据，可查看节点、关系和基础统计信息。'
  }
  if (lower.includes('启动') || lower.includes('pnpm')) {
    return '独立模式下只需进入 web 目录执行 pnpm install，然后执行 pnpm dev 即可启动前端。'
  }
  return `这是来自 ${agentId} 的 mock 回复：已收到你的问题“${query}”，当前前端运行在独立演示模式。`
}

const buildLightRagResult = (query) => ({
  metadata: {
    query_mode: 'hybrid',
    processing_info: {
      total_entities_found: 3,
      total_relations_found: 2,
      final_chunks_count: 2
    },
    keywords: {
      high_level: ['Yuxi-Know', '知识图谱'],
      low_level: query.split(/\s+/).filter(Boolean).slice(0, 3)
    }
  },
  data: {
    entities: [
      {
        entity_name: 'Yuxi-Know',
        entity_type: 'platform',
        description: '一个融合知识库、知识图谱和智能体的开发平台。',
        source_id: 'doc-light-1',
        file_path: '/mock-files/平台简介.md'
      },
      {
        entity_name: 'LightRAG',
        entity_type: 'tech',
        description: '用于图检索增强的知识库实现。',
        source_id: 'doc-light-2',
        file_path: '/mock-files/架构设计.pdf'
      }
    ],
    relationships: [
      {
        src_id: 'Yuxi-Know',
        tgt_id: 'LightRAG',
        weight: 0.91,
        description: '平台通过 LightRAG 承载图检索能力。',
        keywords: 'graph, rag',
        source_id: 'doc-light-2',
        file_path: '/mock-files/架构设计.pdf'
      }
    ],
    chunks: [
      {
        reference_id: 1,
        chunk_id: 'chunk-light-1',
        content: `针对问题“${query}”，推荐先查看平台简介与架构设计文档。`,
        file_path: '/mock-files/平台简介.md'
      }
    ],
    references: [
      {
        reference_id: 1,
        file_path: '/mock-files/平台简介.md'
      },
      {
        reference_id: 2,
        file_path: '/mock-files/架构设计.pdf'
      }
    ]
  }
})

const buildMilvusResult = (query, dbId) => [
  {
    score: 0.92,
    rerank_score: 0.89,
    content: `针对“${query}”的最佳结果：进入 web 目录执行 pnpm install 后运行 pnpm dev。`,
    metadata: {
      source: '部署指南.txt',
      file_id: 'doc-milvus-1',
      chunk_index: 0,
      db_id: dbId
    },
    distance: 0.08
  },
  {
    score: 0.78,
    rerank_score: 0.75,
    content: '独立前端模式使用开发期 mock 接口，因此无需启动后端容器也可体验主要功能。',
    metadata: {
      source: '部署指南.txt',
      file_id: 'doc-milvus-1',
      chunk_index: 1,
      db_id: dbId
    },
    distance: 0.22
  }
]

const sendJson = (res, statusCode, payload, extraHeaders = {}) => {
  res.statusCode = statusCode
  for (const [key, value] of Object.entries({ ...JSON_HEADERS, ...extraHeaders })) {
    res.setHeader(key, value)
  }
  res.end(JSON.stringify(payload))
}

const sendText = (res, statusCode, body, extraHeaders = {}) => {
  res.statusCode = statusCode
  for (const [key, value] of Object.entries({ ...TEXT_HEADERS, ...extraHeaders })) {
    res.setHeader(key, value)
  }
  res.end(body)
}

const sendBinary = (res, filename, content, contentType = 'application/octet-stream') => {
  res.statusCode = 200
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  res.end(Buffer.from(content, 'utf8'))
}

const sendStream = async (res, chunks) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  for (const chunk of chunks) {
    res.write(`${JSON.stringify(chunk)}\n`)
  }

  res.end()
}

const matchesPath = (pathname, regex) => regex.exec(pathname)

const createResponseLine = (requestId, id, type, content, extra = {}) => ({
  status: 'loading',
  request_id: requestId,
  msg: {
    id,
    type,
    content,
    ...extra
  }
})

const buildDashboardStats = () => {
  const conversations = Object.values(state.threads).flat()
  const totalMessages = conversations.reduce((sum, thread) => sum + thread.messages.length, 0)
  return {
    total_conversations: conversations.length,
    conversation_trend: 18,
    active_conversations: conversations.length,
    total_messages: totalMessages,
    total_users: state.users.length,
    feedback_stats: {
      total_feedbacks: state.feedbacks.length,
      satisfaction_rate: 87
    }
  }
}

const buildUserStats = () => ({
  total_users: state.users.length,
  active_users_24h: 2,
  active_users_30d: state.users.length,
  daily_active_users: [
    { date: '03-04', active_users: 2 },
    { date: '03-05', active_users: 3 },
    { date: '03-06', active_users: 2 },
    { date: '03-07', active_users: 4 },
    { date: '03-08', active_users: 3 },
    { date: '03-09', active_users: 4 },
    { date: '03-10', active_users: 2 }
  ]
})

const buildToolStats = () => ({
  total_calls: 132,
  failed_calls: 7,
  success_rate: 94.7,
  most_used_tools: [
    { tool_name: 'knowledge_base', count: 48 },
    { tool_name: 'knowledge_graph', count: 31 },
    { tool_name: 'todo_list', count: 22 },
    { tool_name: 'write_file', count: 18 }
  ],
  tool_error_distribution: {
    web_search: 3,
    write_file: 2,
    knowledge_graph: 2
  }
})

const buildKnowledgeStats = () => {
  const dbList = Object.values(state.databases)
  const totalFiles = dbList.reduce((sum, db) => sum + Object.values(db.files).filter((file) => !file.is_folder).length, 0)
  const totalStorage = dbList.reduce(
    (sum, db) =>
      sum + Object.values(db.files).reduce((fileSum, file) => fileSum + (file.file_size || 0), 0),
    0
  )

  return {
    total_databases: dbList.length,
    total_files: totalFiles,
    total_storage_size: totalStorage,
    databases_by_type: dbList.reduce((acc, db) => {
      acc[db.kb_type] = (acc[db.kb_type] || 0) + 1
      return acc
    }, {}),
    files_by_type: {
      md: 1,
      pdf: 1,
      txt: 1
    }
  }
}

const buildAgentStats = () => ({
  total_agents: state.agents.length,
  agent_conversation_counts: state.agents.map((agent) => ({
    agent_id: agent.id,
    conversation_count: state.threads[agent.id]?.length || 0
  })),
  agent_tool_usage: state.agents.map((agent, index) => ({
    agent_id: agent.id,
    tool_usage_count: 20 - index * 4
  })),
  top_performing_agents: [
    {
      agent_id: 'knowledge-assistant',
      satisfaction_rate: 92,
      conversation_count: 8
    },
    {
      agent_id: 'report-writer',
      satisfaction_rate: 86,
      conversation_count: 5
    },
    {
      agent_id: 'graph-analyst',
      satisfaction_rate: 83,
      conversation_count: 4
    }
  ]
})

const buildCallTimeseries = (type, timeRange) => {
  const dates =
    timeRange === '14hours'
      ? Array.from({ length: 14 }, (_, index) => `2026-03-10 ${String(index + 8).padStart(2, '0')}:00`)
      : timeRange === '14weeks'
        ? Array.from({ length: 14 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`)
        : Array.from({ length: 14 }, (_, index) => `2026-03-${String(index + 1).padStart(2, '0')}`)

  const categoryMap = {
    agents: ['knowledge-assistant', 'graph-analyst', 'report-writer'],
    models: ['gpt-4o-mini', 'deepseek-chat'],
    tools: ['knowledge_base', 'knowledge_graph', 'todo_list'],
    tokens: ['prompt_tokens', 'completion_tokens']
  }

  const categories = categoryMap[type] || categoryMap.agents
  const data = dates.map((date, index) => ({
    date,
    data: Object.fromEntries(
      categories.map((category, categoryIndex) => [
        category,
        type === 'tokens'
          ? 1800000 + index * 80000 + categoryIndex * 350000
          : 6 + index + categoryIndex * 2
      ])
    )
  }))

  return {
    categories,
    data
  }
}

const buildGraphList = () => [
  { id: 'neo4j', name: 'Neo4j 图数据库', type: 'neo4j' },
  ...Object.values(state.databases).map((db) => ({
    id: db.db_id,
    name: db.name,
    type: db.kb_type
  }))
]

const filterGraphByLabel = (graph, keyword) => {
  if (!keyword || keyword === '*') {
    return clone(graph)
  }
  const normalized = keyword.toLowerCase()
  const matchedNodes = graph.nodes.filter((node) => String(node.name || '').toLowerCase().includes(normalized))
  const nodeIds = new Set(matchedNodes.map((node) => node.id))
  const matchedEdges = graph.edges.filter(
    (edge) => nodeIds.has(edge.source_id) || nodeIds.has(edge.target_id)
  )
  for (const edge of matchedEdges) {
    nodeIds.add(edge.source_id)
    nodeIds.add(edge.target_id)
  }
  return {
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: matchedEdges
  }
}

const findUserByUsername = (username) =>
  state.users.find((user) => user.user_id === username || user.phone_number === username)

const createToken = (userId) => {
  const token = `mock-token-${userId}-${Date.now()}`
  state.tokens.set(token, userId)
  return token
}

const invalidateUserTokens = (userId) => {
  for (const [token, id] of state.tokens.entries()) {
    if (id === userId) {
      state.tokens.delete(token)
    }
  }
}

const createThread = (agentId, title = '新的对话', metadata = {}) => {
  const createdAt = createTimestamp()
  const thread = {
    id: `thread-${randomUUID().slice(0, 8)}`,
    agent_id: agentId,
    title,
    description: metadata.description || '',
    created_at: createdAt,
    updated_at: createdAt,
    messages: [],
    attachments: [],
    agent_state: {
      todos: [],
      files: []
    }
  }
  state.threads[agentId] = state.threads[agentId] || []
  state.threads[agentId].unshift(thread)
  return thread
}

const appendFeedbackIfNeeded = (messageId, rating, reason, user) => {
  const existing = state.feedbacks.find((item) => item.message_id === messageId)
  if (existing) {
    existing.rating = rating
    existing.reason = reason
    return existing
  }

  const feedback = {
    id: state.nextFeedbackId++,
    message_id: messageId,
    rating,
    reason,
    username: user.username,
    avatar: user.avatar,
    conversation_title: 'Mock 对话反馈',
    message_content: '这是一次 mock 反馈记录。',
    created_at: createTimestamp(),
    agent_id: 'knowledge-assistant'
  }
  state.feedbacks.unshift(feedback)
  return feedback
}

const handleChatStream = async (req, res, pathname) => {
  const auth = requireAuthUser(req)
  if (auth.error) {
    sendJson(res, auth.error.status, auth.error.body)
    return
  }

  const match = pathname.match(/^\/api\/chat\/agent\/([^/]+)$/)
  if (!match) {
    sendJson(res, 404, { detail: 'Not found' })
    return
  }

  const agentId = decodeURIComponent(match[1])
  const payload = await parseRequestBody(req)
  const query = payload.query || ''
  const threadId = payload.config?.thread_id
  const thread = findThreadById(threadId)
  if (!thread) {
    sendJson(res, 404, { detail: '会话不存在' })
    return
  }

  const requestId = `req-${randomUUID().slice(0, 8)}`
  const assistantId = `ai-${randomUUID().slice(0, 8)}`
  const answer = createChatAnswer(query, agentId)

  thread.messages.push({
    id: `human-${randomUUID().slice(0, 8)}`,
    type: 'human',
    content: query,
    created_at: createTimestamp()
  })

  thread.messages.push({
    id: assistantId,
    type: 'ai',
    content: answer,
    created_at: createTimestamp(),
    tool_calls: []
  })
  thread.updated_at = createTimestamp()
  thread.agent_state = {
    todos: [
      { title: '识别问题意图', done: true },
      { title: '整理回答结果', done: true }
    ],
    files: [
      {
        result: {
          name: 'mock-answer.txt',
          path: '/mock-files/mock-answer.txt'
        }
      }
    ]
  }

  await sendStream(res, [
    {
      status: 'init',
      request_id: requestId,
      msg: {
        id: `human-${randomUUID().slice(0, 8)}`,
        type: 'human',
        content: query
      }
    },
    createResponseLine(requestId, assistantId, 'AIMessageChunk', answer.slice(0, Math.max(12, Math.floor(answer.length / 2)))),
    createResponseLine(requestId, assistantId, 'AIMessageChunk', answer.slice(Math.max(12, Math.floor(answer.length / 2)))),
    {
      status: 'agent_state',
      request_id: requestId,
      agent_state: clone(thread.agent_state)
    },
    {
      status: 'finished',
      request_id: requestId
    }
  ])
}

const handleResumeStream = async (req, res, pathname) => {
  const auth = requireAuthUser(req)
  if (auth.error) {
    sendJson(res, auth.error.status, auth.error.body)
    return
  }

  const match = pathname.match(/^\/api\/chat\/agent\/([^/]+)\/resume$/)
  if (!match) {
    sendJson(res, 404, { detail: 'Not found' })
    return
  }

  const payload = await parseRequestBody(req)
  const thread = findThreadById(payload.thread_id)
  if (!thread) {
    sendJson(res, 404, { detail: '会话不存在' })
    return
  }

  const requestId = `resume-${randomUUID().slice(0, 8)}`
  const assistantId = `ai-${randomUUID().slice(0, 8)}`
  const approved = payload.approved !== false
  const content = approved ? '审批已通过，mock 对话继续执行完成。' : '审批已拒绝，本次操作已终止。'

  thread.messages.push({
    id: assistantId,
    type: 'ai',
    content,
    created_at: createTimestamp(),
    tool_calls: []
  })
  thread.updated_at = createTimestamp()

  await sendStream(res, [
    {
      status: 'init',
      request_id: requestId,
      msg: {
        id: assistantId,
        type: 'AIMessageChunk',
        content: ''
      }
    },
    createResponseLine(requestId, assistantId, 'AIMessageChunk', content),
    {
      status: 'finished',
      request_id: requestId
    }
  ])
}

const handleMockApi = async (req, res) => {
  const method = (req.method || 'GET').toUpperCase()
  const url = new URL(req.url || '/', 'http://localhost')
  const { pathname, searchParams } = url

  if (method === 'POST' && /^\/api\/chat\/agent\/[^/]+$/.test(pathname)) {
    await handleChatStream(req, res, pathname)
    return
  }

  if (method === 'POST' && /^\/api\/chat\/agent\/[^/]+\/resume$/.test(pathname)) {
    await handleResumeStream(req, res, pathname)
    return
  }

  if (method === 'GET' && pathname === '/api/system/health') {
    sendJson(res, 200, { status: 'ok', message: 'mock server ready' })
    return
  }

  if (method === 'GET' && pathname === '/api/system/info') {
    sendJson(res, 200, { success: true, data: clone(state.infoConfig) })
    return
  }

  if (method === 'POST' && pathname === '/api/system/info/reload') {
    sendJson(res, 200, { success: true, data: clone(state.infoConfig) })
    return
  }

  if (method === 'GET' && pathname === '/api/auth/check-first-run') {
    sendJson(res, 200, { first_run: state.users.length === 0 })
    return
  }

  if (method === 'POST' && pathname === '/api/auth/initialize') {
    const body = await parseRequestBody(req)
    const departmentName = getDepartmentName(1) || '平台研发'
    const user = {
      id: state.nextUserId++,
      user_id: body.user_id || `admin_${Date.now()}`,
      username: body.user_id || '超级管理员',
      password: body.password || 'admin123',
      role: 'superadmin',
      phone_number: body.phone_number || '',
      avatar: '/avatar.jpg',
      department_id: 1,
      department_name: departmentName,
      created_at: createTimestamp()
    }
    state.users.push(user)
    updateDepartmentCounts()
    const token = createToken(user.id)
    sendJson(res, 200, buildTokenPayload(user, token))
    return
  }

  if (method === 'POST' && pathname === '/api/auth/token') {
    const body = await parseRequestBody(req)
    const fields = body.fields || body
    const username = fields.username || ''
    const password = fields.password || ''
    const user = findUserByUsername(username)

    if (!user || user.password !== password) {
      sendJson(res, 401, { detail: '用户名或密码错误' })
      return
    }

    invalidateUserTokens(user.id)
    const token = createToken(user.id)
    sendJson(res, 200, buildTokenPayload(user, token))
    return
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildUserPayload(auth.user))
    return
  }

  if (method === 'PUT' && pathname === '/api/auth/profile') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    auth.user.username = body.username || auth.user.username
    auth.user.phone_number = body.phone_number ?? auth.user.phone_number
    sendJson(res, 200, buildUserPayload(auth.user))
    return
  }

  if (method === 'POST' && pathname === '/api/auth/upload-avatar') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    auth.user.avatar = '/avatar.jpg'
    sendJson(res, 200, { avatar_url: auth.user.avatar })
    return
  }

  if (method === 'GET' && pathname === '/api/auth/users') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, state.users.map(buildUserPayload))
    return
  }

  if (method === 'POST' && pathname === '/api/auth/users') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const username = String(body.username || '').trim()
    const generatedUserId = username
      ? username
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_')
          .replace(/^_+|_+$/g, '') || `user_${state.nextUserId}`
      : `user_${state.nextUserId}`
    const departmentId = body.department_id || null
    const user = {
      id: state.nextUserId++,
      user_id: generatedUserId,
      username: username || `用户${state.nextUserId}`,
      password: body.password || '123456',
      role: body.role || 'user',
      phone_number: body.phone_number || '',
      avatar: '',
      department_id: departmentId,
      department_name: getDepartmentName(departmentId),
      created_at: createTimestamp()
    }
    state.users.unshift(user)
    updateDepartmentCounts()
    sendJson(res, 200, buildUserPayload(user))
    return
  }

  const userIdMatch = matchesPath(pathname, /^\/api\/auth\/users\/(\d+)$/)
  if (userIdMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const target = state.users.find((item) => item.id === Number(userIdMatch[1]))
    if (!target) {
      sendJson(res, 404, { detail: '用户不存在' })
      return
    }
    const body = await parseRequestBody(req)
    target.username = body.username || target.username
    target.phone_number = body.phone_number ?? target.phone_number
    target.role = body.role || target.role
    if (Object.prototype.hasOwnProperty.call(body, 'department_id')) {
      target.department_id = body.department_id
      target.department_name = getDepartmentName(body.department_id)
    }
    if (body.password) {
      target.password = body.password
    }
    updateDepartmentCounts()
    sendJson(res, 200, buildUserPayload(target))
    return
  }

  if (userIdMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const index = state.users.findIndex((item) => item.id === Number(userIdMatch[1]))
    if (index === -1) {
      sendJson(res, 404, { detail: '用户不存在' })
      return
    }
    const [removed] = state.users.splice(index, 1)
    invalidateUserTokens(removed.id)
    updateDepartmentCounts()
    sendJson(res, 200, { message: '用户已删除' })
    return
  }

  if (method === 'POST' && pathname === '/api/auth/validate-username') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const username = String(body.username || '')
    const userId = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_')
      .replace(/^_+|_+$/g, '')
    sendJson(res, 200, { user_id: userId || `user_${state.nextUserId}` })
    return
  }

  const checkUserIdMatch = matchesPath(pathname, /^\/api\/auth\/check-user-id\/([^/]+)$/)
  if (checkUserIdMatch && method === 'GET') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const userId = decodeURIComponent(checkUserIdMatch[1])
    const exists = state.users.some((user) => user.user_id === userId)
    sendJson(res, 200, { is_available: !exists })
    return
  }

  if (method === 'GET' && pathname === '/api/system/config') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, clone(state.config))
    return
  }

  if ((method === 'POST' && pathname === '/api/system/config') || (method === 'POST' && pathname === '/api/system/config/update')) {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    if (pathname.endsWith('/config') && body.key) {
      state.config[body.key] = body.value
    } else {
      Object.assign(state.config, body)
    }
    sendJson(res, 200, clone(state.config))
    return
  }

  if (method === 'GET' && pathname === '/api/system/logs') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      logs: [
        { level: 'INFO', message: 'Mock server started', created_at: createTimestamp(-10) },
        { level: 'INFO', message: 'Web standalone mode enabled', created_at: createTimestamp(-5) }
      ]
    })
    return
  }

  if (method === 'GET' && pathname === '/api/system/health/ocr') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      status: 'healthy',
      message: 'Mock OCR is available'
    })
    return
  }

  if (method === 'GET' && pathname === '/api/system/ocr/health') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      services: {
        onnx_rapid_ocr: { status: 'healthy', message: '可用' },
        mineru_ocr: { status: 'healthy', message: '可用' },
        mineru_official: { status: 'unavailable', message: '未配置远程凭证' },
        paddlex_ocr: { status: 'healthy', message: '可用' },
        deepseek_ocr: { status: 'healthy', message: '可用' }
      }
    })
    return
  }

  if (method === 'GET' && pathname === '/api/system/ocr/stats') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      total_requests: 24,
      success_rate: 98
    })
    return
  }

  if (method === 'GET' && pathname === '/api/system/chat-models/all/status') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      status: Object.fromEntries(
        Object.keys(state.config.model_names).map((provider) => [
          provider,
          {
            status: state.config.model_provider_status[provider] ? 'available' : 'unavailable',
            message: state.config.model_provider_status[provider] ? 'Mock provider ready' : '未配置'
          }
        ])
      )
    })
    return
  }

  if (method === 'GET' && pathname === '/api/system/chat-models/status') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      status: {
        status: 'available',
        message: 'Mock model available'
      }
    })
    return
  }

  if (method === 'GET' && pathname === '/api/system/custom-providers') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, clone(state.customProviders))
    return
  }

  if (method === 'POST' && pathname === '/api/system/custom-providers') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const providerId = body.provider_id
    const providerData = body.provider_data || {}
    state.customProviders[providerId] = { provider_id: providerId, ...providerData }
    state.config.model_names[providerId] = {
      name: providerData.name || providerId,
      env: providerData.env || 'CUSTOM_PROVIDER_KEY',
      url: providerData.url || '',
      models: providerData.models || [],
      custom: true,
      base_url: providerData.base_url,
      default: providerData.default
    }
    state.config.model_provider_status[providerId] = true
    sendJson(res, 200, { success: true, message: '自定义供应商已添加' })
    return
  }

  const customProviderMatch = matchesPath(pathname, /^\/api\/system\/custom-providers\/([^/]+)$/)
  if (customProviderMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const providerId = decodeURIComponent(customProviderMatch[1])
    const body = await parseRequestBody(req)
    state.customProviders[providerId] = {
      provider_id: providerId,
      ...state.customProviders[providerId],
      ...body
    }
    state.config.model_names[providerId] = {
      ...(state.config.model_names[providerId] || {}),
      name: body.name || providerId,
      url: body.url || '',
      models: body.models || [],
      custom: true,
      base_url: body.base_url,
      default: body.default
    }
    sendJson(res, 200, { success: true, message: '自定义供应商已更新' })
    return
  }

  if (customProviderMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const providerId = decodeURIComponent(customProviderMatch[1])
    delete state.customProviders[providerId]
    delete state.config.model_names[providerId]
    delete state.config.model_provider_status[providerId]
    sendJson(res, 200, { success: true, message: '自定义供应商已删除' })
    return
  }

  const customProviderTestMatch = matchesPath(
    pathname,
    /^\/api\/system\/custom-providers\/([^/]+)\/test$/
  )
  if (customProviderTestMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, message: 'Mock 连接测试成功' })
    return
  }

  if (method === 'GET' && pathname === '/api/system/mcp-servers') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, data: clone(state.mcpServers) })
    return
  }

  if (method === 'POST' && pathname === '/api/system/mcp-servers') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    state.mcpServers.push({
      ...body,
      enabled: true,
      created_by: auth.user.user_id,
      created_at: createTimestamp(),
      updated_at: createTimestamp()
    })
    state.mcpTools[body.name] = []
    sendJson(res, 200, { success: true, message: 'MCP 服务器已创建' })
    return
  }

  const mcpServerMatch = matchesPath(pathname, /^\/api\/system\/mcp-servers\/([^/]+)$/)
  if (mcpServerMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const name = decodeURIComponent(mcpServerMatch[1])
    const server = state.mcpServers.find((item) => item.name === name)
    if (!server) {
      sendJson(res, 404, { success: false, message: '服务器不存在' })
      return
    }
    sendJson(res, 200, { success: true, data: clone(server) })
    return
  }

  if (mcpServerMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const name = decodeURIComponent(mcpServerMatch[1])
    const server = state.mcpServers.find((item) => item.name === name)
    if (!server) {
      sendJson(res, 404, { success: false, message: '服务器不存在' })
      return
    }
    const body = await parseRequestBody(req)
    Object.assign(server, body, { updated_at: createTimestamp() })
    sendJson(res, 200, { success: true, message: 'MCP 服务器已更新' })
    return
  }

  if (mcpServerMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const name = decodeURIComponent(mcpServerMatch[1])
    const index = state.mcpServers.findIndex((item) => item.name === name)
    if (index === -1) {
      sendJson(res, 404, { success: false, message: '服务器不存在' })
      return
    }
    state.mcpServers.splice(index, 1)
    delete state.mcpTools[name]
    sendJson(res, 200, { success: true, message: 'MCP 服务器已删除' })
    return
  }

  const mcpTestMatch = matchesPath(pathname, /^\/api\/system\/mcp-servers\/([^/]+)\/test$/)
  if (mcpTestMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, message: 'Mock 连接成功' })
    return
  }

  const mcpToggleMatch = matchesPath(pathname, /^\/api\/system\/mcp-servers\/([^/]+)\/toggle$/)
  if (mcpToggleMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const name = decodeURIComponent(mcpToggleMatch[1])
    const server = state.mcpServers.find((item) => item.name === name)
    if (!server) {
      sendJson(res, 404, { success: false, message: '服务器不存在' })
      return
    }
    server.enabled = !server.enabled
    server.updated_at = createTimestamp()
    sendJson(res, 200, { success: true, message: server.enabled ? '服务器已启用' : '服务器已禁用' })
    return
  }

  const mcpToolsMatch = matchesPath(pathname, /^\/api\/system\/mcp-servers\/([^/]+)\/tools$/)
  if (mcpToolsMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const name = decodeURIComponent(mcpToolsMatch[1])
    sendJson(res, 200, { success: true, data: clone(state.mcpTools[name] || []) })
    return
  }

  const mcpRefreshToolsMatch = matchesPath(
    pathname,
    /^\/api\/system\/mcp-servers\/([^/]+)\/tools\/refresh$/
  )
  if (mcpRefreshToolsMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, message: '工具列表已刷新' })
    return
  }

  const mcpToggleToolMatch = matchesPath(
    pathname,
    /^\/api\/system\/mcp-servers\/([^/]+)\/tools\/([^/]+)\/toggle$/
  )
  if (mcpToggleToolMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const serverName = decodeURIComponent(mcpToggleToolMatch[1])
    const toolName = decodeURIComponent(mcpToggleToolMatch[2])
    const tool = (state.mcpTools[serverName] || []).find((item) => item.name === toolName)
    if (!tool) {
      sendJson(res, 404, { success: false, message: '工具不存在' })
      return
    }
    tool.enabled = !tool.enabled
    sendJson(res, 200, { success: true, message: tool.enabled ? '工具已启用' : '工具已禁用' })
    return
  }

  if (method === 'GET' && pathname === '/api/departments') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, clone(state.departments))
    return
  }

  if (method === 'POST' && pathname === '/api/departments') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const department = {
      id: state.nextDepartmentId++,
      name: body.name,
      description: body.description || '',
      user_count: 1
    }
    state.departments.push(department)
    const adminUser = {
      id: state.nextUserId++,
      user_id: body.admin_user_id || `dept_admin_${state.nextUserId}`,
      username: body.admin_user_id || `部门管理员${state.nextUserId}`,
      password: body.admin_password || '123456',
      role: 'admin',
      phone_number: body.admin_phone || '',
      avatar: '',
      department_id: department.id,
      department_name: department.name,
      created_at: createTimestamp()
    }
    state.users.push(adminUser)
    updateDepartmentCounts()
    sendJson(res, 200, clone(department))
    return
  }

  const departmentMatch = matchesPath(pathname, /^\/api\/departments\/(\d+)$/)
  if (departmentMatch && method === 'GET') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const department = state.departments.find((item) => item.id === Number(departmentMatch[1]))
    if (!department) {
      sendJson(res, 404, { detail: '部门不存在' })
      return
    }
    sendJson(res, 200, clone(department))
    return
  }

  if (departmentMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const department = state.departments.find((item) => item.id === Number(departmentMatch[1]))
    if (!department) {
      sendJson(res, 404, { detail: '部门不存在' })
      return
    }
    const body = await parseRequestBody(req)
    department.name = body.name || department.name
    department.description = body.description ?? department.description
    state.users
      .filter((user) => user.department_id === department.id)
      .forEach((user) => {
        user.department_name = department.name
      })
    sendJson(res, 200, clone(department))
    return
  }

  if (departmentMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const index = state.departments.findIndex((item) => item.id === Number(departmentMatch[1]))
    if (index === -1) {
      sendJson(res, 404, { detail: '部门不存在' })
      return
    }
    state.departments.splice(index, 1)
    state.users.forEach((user) => {
      if (user.department_id === Number(departmentMatch[1])) {
        user.department_id = null
        user.department_name = ''
      }
    })
    updateDepartmentCounts()
    sendJson(res, 200, { message: '部门已删除' })
    return
  }

  if (method === 'GET' && pathname === '/api/chat/default_agent') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { default_agent_id: state.defaultAgentId })
    return
  }

  if (method === 'GET' && pathname === '/api/chat/agent') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { agents: clone(state.agents) })
    return
  }

  const agentConfigMatch = matchesPath(pathname, /^\/api\/chat\/agent\/([^/]+)\/config$/)
  if (agentConfigMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const agentId = decodeURIComponent(agentConfigMatch[1])
    sendJson(res, 200, { config: clone(state.agentConfigs[agentId] || {}) })
    return
  }

  if (agentConfigMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const agentId = decodeURIComponent(agentConfigMatch[1])
    const body = await parseRequestBody(req)
    state.agentConfigs[agentId] = clone(body)
    sendJson(res, 200, { success: true, config: clone(state.agentConfigs[agentId]) })
    return
  }

  const agentDetailMatch = matchesPath(pathname, /^\/api\/chat\/agent\/([^/]+)$/)
  if (agentDetailMatch && method === 'GET') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const agentId = decodeURIComponent(agentDetailMatch[1])
    const detail = state.agentDetails[agentId]
    if (!detail) {
      sendJson(res, 404, { detail: '智能体不存在' })
      return
    }
    sendJson(res, 200, clone(detail))
    return
  }

  if (method === 'POST' && pathname === '/api/chat/set_default_agent') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    state.defaultAgentId = body.agent_id || state.defaultAgentId
    sendJson(res, 200, { success: true, default_agent_id: state.defaultAgentId })
    return
  }

  if (method === 'GET' && pathname === '/api/chat/models') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const provider = searchParams.get('model_provider') || 'openai'
    const models = state.config.model_names[provider]?.models || []
    sendJson(res, 200, { models })
    return
  }

  if (method === 'POST' && pathname === '/api/chat/models/update') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const provider = searchParams.get('model_provider') || 'openai'
    const body = await parseRequestBody(req)
    state.config.model_names[provider] = state.config.model_names[provider] || {
      name: provider,
      env: '',
      url: '',
      models: []
    }
    state.config.model_names[provider].models = Array.isArray(body) ? body : []
    sendJson(res, 200, { models: clone(state.config.model_names[provider].models) })
    return
  }

  if (method === 'POST' && pathname === '/api/chat/call') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    sendJson(res, 200, { answer: createChatAnswer(body.query || '', state.defaultAgentId) })
    return
  }

  const historyMatch = matchesPath(pathname, /^\/api\/chat\/agent\/([^/]+)\/history$/)
  if (historyMatch && method === 'GET') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const threadId = searchParams.get('thread_id')
    const thread = findThreadById(threadId)
    sendJson(res, 200, { history: clone(thread?.messages || []) })
    return
  }

  const stateMatch = matchesPath(pathname, /^\/api\/chat\/agent\/([^/]+)\/state$/)
  if (stateMatch && method === 'GET') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const threadId = searchParams.get('thread_id')
    const thread = findThreadById(threadId)
    sendJson(res, 200, { agent_state: clone(thread?.agent_state || { todos: [], files: [] }) })
    return
  }

  const feedbackMatch = matchesPath(pathname, /^\/api\/chat\/message\/([^/]+)\/feedback$/)
  if (feedbackMatch && method === 'POST') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const feedback = appendFeedbackIfNeeded(feedbackMatch[1], body.rating, body.reason, auth.user)
    sendJson(res, 200, clone(feedback))
    return
  }

  if (feedbackMatch && method === 'GET') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const feedback = state.feedbacks.find((item) => item.message_id === feedbackMatch[1])
    sendJson(res, 200, feedback ? clone(feedback) : { rating: null, reason: null })
    return
  }

  if (method === 'POST' && pathname === '/api/chat/image/upload') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      success: true,
      imageContent: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8mV8AAAAASUVORK5CYII='
    })
    return
  }

  if (method === 'GET' && pathname === '/api/chat/threads') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const agentId = searchParams.get('agent_id') || state.defaultAgentId
    sendJson(res, 200, clone(state.threads[agentId] || []))
    return
  }

  if (method === 'POST' && pathname === '/api/chat/thread') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const thread = createThread(body.agent_id, body.title, body.metadata)
    sendJson(res, 200, clone(thread))
    return
  }

  const threadMatch = matchesPath(pathname, /^\/api\/chat\/thread\/([^/]+)$/)
  if (threadMatch && method === 'PUT') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const thread = findThreadById(threadMatch[1])
    if (!thread) {
      sendJson(res, 404, { detail: '会话不存在' })
      return
    }
    thread.title = body.title || thread.title
    thread.description = body.description ?? thread.description
    thread.updated_at = createTimestamp()
    sendJson(res, 200, clone(thread))
    return
  }

  if (threadMatch && method === 'DELETE') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const threadId = threadMatch[1]
    for (const threadList of Object.values(state.threads)) {
      const index = threadList.findIndex((item) => item.id === threadId)
      if (index !== -1) {
        threadList.splice(index, 1)
        sendJson(res, 200, { success: true })
        return
      }
    }
    sendJson(res, 404, { detail: '会话不存在' })
    return
  }

  const threadAttachmentsMatch = matchesPath(
    pathname,
    /^\/api\/chat\/thread\/([^/]+)\/attachments(?:\/([^/]+))?$/
  )
  if (threadAttachmentsMatch && method === 'GET') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const thread = findThreadById(threadAttachmentsMatch[1])
    sendJson(res, 200, {
      attachments: clone(thread?.attachments || []),
      limits: {
        max_files: 5,
        max_file_size_mb: 20
      }
    })
    return
  }

  if (threadAttachmentsMatch && method === 'POST') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const thread = findThreadById(threadAttachmentsMatch[1])
    if (!thread) {
      sendJson(res, 404, { detail: '会话不存在' })
      return
    }
    const body = await parseRequestBody(req)
    const file = body.files?.[0]
    const attachment = {
      file_id: `attach-${randomUUID().slice(0, 8)}`,
      filename: file?.filename || 'mock-attachment.txt',
      status: 'done',
      size: (file?.content || '').length || 1024
    }
    thread.attachments.push(attachment)
    sendJson(res, 200, clone(attachment))
    return
  }

  if (threadAttachmentsMatch && method === 'DELETE') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const thread = findThreadById(threadAttachmentsMatch[1])
    if (!thread) {
      sendJson(res, 404, { detail: '会话不存在' })
      return
    }
    thread.attachments = thread.attachments.filter((item) => item.file_id !== threadAttachmentsMatch[2])
    sendJson(res, 200, { success: true })
    return
  }

  if (method === 'GET' && pathname === '/api/knowledge/databases') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      databases: Object.values(state.databases).map(buildDatabaseSummary)
    })
    return
  }

  if (method === 'POST' && pathname === '/api/knowledge/databases') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const dbId = `db-${randomUUID().slice(0, 8)}`
    const db = {
      db_id: dbId,
      name: body.database_name || body.name || '新知识库',
      description: body.description || '这是一个通过 mock 创建的知识库。',
      kb_type: body.kb_type || 'milvus',
      created_at: createTimestamp(),
      embed_info: {
        name: body.embed_model_name || state.config.embed_model,
        dimension:
          state.config.embed_model_names[body.embed_model_name || state.config.embed_model]?.dimension || 1024
      },
      llm_info: clone(body.llm_info || { provider: 'openai', model_name: 'gpt-4o-mini' }),
      additional_params: {
        auto_generate_questions: false
      },
      files: {}
    }
    state.databases[dbId] = db
    state.queryParams[dbId] = clone(state.queryParams['kb-demo-milvus'])
    state.sampleQuestions[dbId] = []
    sendJson(res, 200, buildDatabaseDetail(db))
    return
  }

  if (method === 'POST' && pathname === '/api/knowledge/generate-description') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    sendJson(res, 200, {
      description: `${body.name || '该知识库'}用于管理与“${body.name || '业务'}”相关的资料与知识内容。`
    })
    return
  }

  const databaseMatch = matchesPath(pathname, /^\/api\/knowledge\/databases\/([^/]+)$/)
  if (databaseMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(databaseMatch[1])
    if (!db) {
      sendJson(res, 404, { detail: '知识库不存在' })
      return
    }
    sendJson(res, 200, buildDatabaseDetail(db))
    return
  }

  if (databaseMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(databaseMatch[1])
    if (!db) {
      sendJson(res, 404, { detail: '知识库不存在' })
      return
    }
    const body = await parseRequestBody(req)
    db.name = body.name || db.name
    db.description = body.description ?? db.description
    if (body.additional_params) {
      db.additional_params = { ...db.additional_params, ...body.additional_params }
    }
    if (body.llm_info) {
      db.llm_info = { ...db.llm_info, ...body.llm_info }
    }
    sendJson(res, 200, { message: 'success', data: buildDatabaseDetail(db) })
    return
  }

  if (databaseMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    delete state.databases[databaseMatch[1]]
    delete state.queryParams[databaseMatch[1]]
    delete state.sampleQuestions[databaseMatch[1]]
    delete state.mindmaps[databaseMatch[1]]
    delete state.graphSubgraphs[databaseMatch[1]]
    sendJson(res, 200, { message: '删除成功' })
    return
  }

  const createFolderMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/folders$/
  )
  if (createFolderMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(createFolderMatch[1])
    if (!db) {
      sendJson(res, 404, { detail: '知识库不存在' })
      return
    }
    const body = await parseRequestBody(req)
    const fileId = `folder-${randomUUID().slice(0, 8)}`
    db.files[fileId] = {
      file_id: fileId,
      filename: body.folder_name || '新建文件夹',
      is_folder: true,
      parent_id: body.parent_id || null,
      status: 'done',
      created_at: createTimestamp(),
      updated_at: createTimestamp()
    }
    sendJson(res, 200, { message: 'success', file_id: fileId })
    return
  }

  const moveDocumentMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/documents\/([^/]+)\/move$/
  )
  if (moveDocumentMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(moveDocumentMatch[1])
    const file = db?.files[moveDocumentMatch[2]]
    if (!db || !file) {
      sendJson(res, 404, { detail: '文件不存在' })
      return
    }
    const body = await parseRequestBody(req)
    file.parent_id = body.new_parent_id || null
    file.updated_at = createTimestamp()
    sendJson(res, 200, { message: 'success' })
    return
  }

  const addDocumentsMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/documents$/
  )
  if (addDocumentsMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(addDocumentsMatch[1])
    if (!db) {
      sendJson(res, 404, { detail: '知识库不存在' })
      return
    }
    const body = await parseRequestBody(req)
    const items = Array.isArray(body.items) ? body.items : []
    const parentId = body.params?.parent_id || null
    const autoIndex = Boolean(body.params?.auto_index)
    const createdFiles = items.map((item) => {
      const filename = decodeURIComponent(String(item).split('/').pop() || `uploaded-${Date.now()}.txt`)
      const file = createUploadedFile(filename, parentId, autoIndex ? 'indexed' : 'uploaded')
      db.files[file.file_id] = file
      return file
    })
    const task = createTask(
      `知识库导入 (${db.db_id})`,
      'knowledge_ingest',
      autoIndex ? '文件已上传并自动入库' : '文件已上传，等待后续处理',
      { db_id: db.db_id, count: createdFiles.length }
    )
    sendJson(res, 200, {
      status: 'queued',
      message: autoIndex ? '文件已自动入库' : '文件上传成功',
      task_id: task.id
    })
    return
  }

  const documentMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/documents\/([^/]+)(?:\/download)?$/
  )
  if (documentMatch && method === 'GET' && pathname.endsWith('/download')) {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(documentMatch[1])
    const file = db?.files[documentMatch[2]]
    if (!db || !file) {
      sendJson(res, 404, { detail: '文件不存在' })
      return
    }
    sendBinary(res, file.filename, file.content || file.lines?.join('\n') || 'mock file')
    return
  }

  if (documentMatch && method === 'GET' && !pathname.endsWith('/download')) {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(documentMatch[1])
    const file = db?.files[documentMatch[2]]
    if (!db || !file) {
      sendJson(res, 404, { detail: '文件不存在' })
      return
    }
    sendJson(res, 200, {
      status: 'success',
      content: file.content || '',
      lines: file.lines || []
    })
    return
  }

  if (documentMatch && method === 'DELETE' && !pathname.endsWith('/download')) {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(documentMatch[1])
    if (!db || !db.files[documentMatch[2]]) {
      sendJson(res, 404, { detail: '文件不存在' })
      return
    }
    delete db.files[documentMatch[2]]
    sendJson(res, 200, { message: '删除成功' })
    return
  }

  const parseDocsMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/documents\/parse$/
  )
  if (parseDocsMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(parseDocsMatch[1])
    const body = await parseRequestBody(req)
    const fileIds = Array.isArray(body) ? body : []
    for (const fileId of fileIds) {
      if (db?.files[fileId]) {
        db.files[fileId].status = 'parsed'
        db.files[fileId].updated_at = createTimestamp()
      }
    }
    const task = createTask(`文档解析 (${db.db_id})`, 'knowledge_parse', '解析任务已完成', {
      db_id: db.db_id,
      count: fileIds.length
    })
    sendJson(res, 200, { status: 'queued', message: '解析任务已提交', task_id: task.id })
    return
  }

  const indexDocsMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/documents\/index$/
  )
  if (indexDocsMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(indexDocsMatch[1])
    const body = await parseRequestBody(req)
    const fileIds = Array.isArray(body.file_ids) ? body.file_ids : []
    for (const fileId of fileIds) {
      if (db?.files[fileId]) {
        db.files[fileId].status = 'indexed'
        db.files[fileId].updated_at = createTimestamp()
      }
    }
    const task = createTask(`文档入库 (${db.db_id})`, 'knowledge_index', '入库任务已完成', {
      db_id: db.db_id,
      count: fileIds.length
    })
    sendJson(res, 200, { status: 'queued', message: '入库任务已提交', task_id: task.id })
    return
  }

  const queryMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/query(?:-test)?$/
  )
  if (queryMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(queryMatch[1])
    const body = await parseRequestBody(req)
    const query = body.query || ''
    if (!db) {
      sendJson(res, 404, { detail: '知识库不存在' })
      return
    }
    const result = db.kb_type === 'lightrag' ? buildLightRagResult(query) : buildMilvusResult(query, db.db_id)
    sendJson(res, 200, result)
    return
  }

  const queryParamsMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/query-params$/
  )
  if (queryParamsMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { params: clone(state.queryParams[queryParamsMatch[1]] || { options: [] }) })
    return
  }

  if (queryParamsMatch && method === 'PUT') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const options = state.queryParams[queryParamsMatch[1]]?.options || []
    state.queryParams[queryParamsMatch[1]] = {
      options: options.map((option) => ({
        ...option,
        default: Object.prototype.hasOwnProperty.call(body, option.key) ? body[option.key] : option.default
      }))
    }
    sendJson(res, 200, { message: 'success' })
    return
  }

  const sampleQuestionsMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/databases\/([^/]+)\/sample-questions$/
  )
  if (sampleQuestionsMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { questions: clone(state.sampleQuestions[sampleQuestionsMatch[1]] || []) })
    return
  }

  if (sampleQuestionsMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    const count = Number(body.count || 3)
    const db = ensureDatabase(sampleQuestionsMatch[1])
    const questions = Array.from({ length: count }, (_, index) => `${db?.name || '该知识库'}的示例问题 ${index + 1}`)
    state.sampleQuestions[sampleQuestionsMatch[1]] = questions
    sendJson(res, 200, { questions })
    return
  }

  if (method === 'POST' && pathname === '/api/knowledge/files/upload') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = searchParams.get('db_id')
    const body = await parseRequestBody(req)
    const file = body.files?.[0]
    const filename = file?.filename || `mock-upload-${state.nextUploadedFileId}.txt`
    const response = {
      file_path: createSourcePath(filename),
      content_hash: `mock-hash-${randomUUID().slice(0, 8)}`
    }
    if (dbId && state.databases[dbId]) {
      const sameNameFiles = Object.values(state.databases[dbId].files).filter(
        (item) => !item.is_folder && item.filename === filename
      )
      if (sameNameFiles.length > 0) {
        response.has_same_name = true
        response.same_name_files = clone(sameNameFiles)
      }
    }
    sendJson(res, 200, response)
    return
  }

  if (method === 'GET' && pathname === '/api/knowledge/files/supported-types') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      file_types: ['.txt', '.md', '.pdf', '.docx', '.json', '.jsonl', '.png', '.jpg']
    })
    return
  }

  if (method === 'POST' && pathname === '/api/knowledge/files/upload-folder') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, items: [] })
    return
  }

  if (method === 'POST' && pathname === '/api/knowledge/files/process-folder') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, task_id: createTask('文件夹处理', 'knowledge_ingest', '文件夹处理完成').id })
    return
  }

  if (method === 'GET' && pathname === '/api/knowledge/types') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      kb_types: {
        lightrag: {
          description: '图检索增强知识库，适合实体关系分析',
          class_name: 'LightRagKB'
        },
        milvus: {
          description: '向量知识库，适合标准 RAG 检索场景',
          class_name: 'MilvusKB'
        }
      }
    })
    return
  }

  if (method === 'GET' && pathname === '/api/knowledge/stats') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildKnowledgeStats())
    return
  }

  const embedStatusMatch = matchesPath(
    pathname,
    /^\/api\/knowledge\/embedding-models\/([^/]+)\/status$/
  )
  if (embedStatusMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      status: {
        status: 'available',
        message: 'Mock embedding model ready'
      }
    })
    return
  }

  if (method === 'GET' && pathname === '/api/knowledge/embedding-models/status') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      status: {
        models: Object.fromEntries(
          Object.keys(state.config.embed_model_names).map((modelId) => [
            modelId,
            {
              status: 'available',
              message: 'Mock embedding model ready'
            }
          ])
        )
      }
    })
    return
  }

  if (method === 'GET' && pathname === '/api/mindmap/databases') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { databases: Object.values(state.databases).map(buildDatabaseSummary) })
    return
  }

  const mindmapFilesMatch = matchesPath(pathname, /^\/api\/mindmap\/databases\/([^/]+)\/files$/)
  if (mindmapFilesMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const db = ensureDatabase(mindmapFilesMatch[1])
    sendJson(res, 200, {
      files: Object.values(db?.files || {}).filter((file) => !file.is_folder)
    })
    return
  }

  if (method === 'POST' && pathname === '/api/mindmap/generate') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    state.mindmaps[body.db_id] = state.mindmaps[body.db_id] || {
      content: '自动生成思维导图',
      children: [{ content: '文件摘要' }, { content: '关键主题' }]
    }
    sendJson(res, 200, { mindmap: clone(state.mindmaps[body.db_id]) })
    return
  }

  const mindmapByDbMatch = matchesPath(pathname, /^\/api\/mindmap\/database\/([^/]+)$/)
  if (mindmapByDbMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const mindmap = state.mindmaps[mindmapByDbMatch[1]]
    if (!mindmap) {
      sendJson(res, 404, { detail: '思维导图不存在' })
      return
    }
    sendJson(res, 200, { mindmap: clone(mindmap) })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/list') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, data: buildGraphList() })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/subgraph') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = searchParams.get('db_id') || 'neo4j'
    const keyword = searchParams.get('node_label') || '*'
    const graph = state.graphSubgraphs[dbId] || { nodes: [], edges: [] }
    sendJson(res, 200, {
      success: true,
      data: filterGraphByLabel(graph, keyword)
    })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/stats') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = searchParams.get('db_id') || 'neo4j'
    const graph = state.graphSubgraphs[dbId] || { nodes: [], edges: [] }
    sendJson(res, 200, {
      success: true,
      data: {
        total_nodes: graph.nodes.length,
        total_edges: graph.edges.length
      }
    })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/labels') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = searchParams.get('db_id') || 'neo4j'
    const graph = state.graphSubgraphs[dbId] || { nodes: [], edges: [] }
    sendJson(res, 200, {
      success: true,
      data: Array.from(new Set(graph.nodes.map((node) => node.type)))
    })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/neo4j/nodes') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      data: clone(state.graphSubgraphs.neo4j)
    })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/neo4j/node') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const entityName = searchParams.get('entity_name') || ''
    const graph = filterGraphByLabel(state.graphSubgraphs.neo4j, entityName)
    sendJson(res, 200, { data: graph })
    return
  }

  if (method === 'POST' && pathname === '/api/graph/neo4j/add-entities') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const body = await parseRequestBody(req)
    state.graphSubgraphs.neo4j.nodes.push({
      id: `uploaded-${randomUUID().slice(0, 6)}`,
      name: decodeURIComponent(String(body.file_path || '').split('/').pop() || '新实体'),
      type: 'uploaded'
    })
    state.neo4jInfo.entity_count = state.graphSubgraphs.neo4j.nodes.length
    state.neo4jInfo.unindexed_node_count += 1
    sendJson(res, 200, { status: 'success', message: '实体导入成功' })
    return
  }

  if (method === 'POST' && pathname === '/api/graph/neo4j/index-entities') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    state.neo4jInfo.unindexed_node_count = 0
    sendJson(res, 200, { status: 'success', message: '索引添加成功' })
    return
  }

  if (method === 'GET' && pathname === '/api/graph/neo4j/info') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    state.neo4jInfo.entity_count = state.graphSubgraphs.neo4j.nodes.length
    state.neo4jInfo.relationship_count = state.graphSubgraphs.neo4j.edges.length
    sendJson(res, 200, { data: clone(state.neo4jInfo) })
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/conversations') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const conversations = Object.values(state.threads).flat().map(toConversationItem)
    sendJson(res, 200, conversations)
    return
  }

  const conversationDetailMatch = matchesPath(pathname, /^\/api\/dashboard\/conversations\/([^/]+)$/)
  if (conversationDetailMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const thread = findThreadById(conversationDetailMatch[1])
    if (!thread) {
      sendJson(res, 404, { detail: '对话不存在' })
      return
    }
    sendJson(res, 200, clone(thread))
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/stats') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildDashboardStats())
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/feedbacks') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const rating = searchParams.get('rating')
    const agentId = searchParams.get('agent_id')
    let list = [...state.feedbacks]
    if (rating) {
      list = list.filter((item) => item.rating === rating)
    }
    if (agentId) {
      list = list.filter((item) => item.agent_id === agentId)
    }
    sendJson(res, 200, clone(list))
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/stats/users') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildUserStats())
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/stats/tools') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildToolStats())
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/stats/knowledge') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildKnowledgeStats())
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/stats/agents') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildAgentStats())
    return
  }

  if (method === 'GET' && pathname === '/api/dashboard/stats/calls/timeseries') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const type = searchParams.get('type') || 'agents'
    const timeRange = searchParams.get('time_range') || '14days'
    sendJson(res, 200, buildCallTimeseries(type, timeRange))
    return
  }

  if (method === 'GET' && pathname === '/api/tasks') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, {
      tasks: clone(state.tasks),
      summary: summarizeTaskList(state.tasks)
    })
    return
  }

  const taskDetailMatch = matchesPath(pathname, /^\/api\/tasks\/([^/]+)$/)
  if (taskDetailMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const task = state.tasks.find((item) => item.id === taskDetailMatch[1])
    if (!task) {
      sendJson(res, 404, { detail: '任务不存在' })
      return
    }
    sendJson(res, 200, { task: clone(task) })
    return
  }

  const taskCancelMatch = matchesPath(pathname, /^\/api\/tasks\/([^/]+)\/cancel$/)
  if (taskCancelMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const task = state.tasks.find((item) => item.id === taskCancelMatch[1])
    if (!task) {
      sendJson(res, 404, { detail: '任务不存在' })
      return
    }
    task.status = 'cancelled'
    task.message = '任务已取消'
    task.updated_at = createTimestamp()
    sendJson(res, 200, { success: true, task: clone(task) })
    return
  }

  if (method === 'GET' && /^\/api\/evaluation\/databases\/[^/]+\/benchmarks$/.test(pathname)) {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = pathname.split('/')[4]
    sendJson(res, 200, { message: 'success', data: clone(state.benchmarks[dbId] || []) })
    return
  }

  const benchmarkDbMatch = matchesPath(
    pathname,
    /^\/api\/evaluation\/databases\/([^/]+)\/benchmarks\/([^/]+)$/
  )
  if (benchmarkDbMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = benchmarkDbMatch[1]
    const benchmarkId = benchmarkDbMatch[2]
    const benchmark = (state.benchmarks[dbId] || []).find((item) => item.benchmark_id === benchmarkId)
    if (!benchmark) {
      sendJson(res, 404, { message: 'not found' })
      return
    }
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('page_size') || '10')
    const start = (page - 1) * pageSize
    const questions = benchmark.questions.slice(start, start + pageSize)
    sendJson(res, 200, {
      message: 'success',
      data: {
        ...clone(benchmark),
        questions,
        pagination: {
          page,
          page_size: pageSize,
          total_questions: benchmark.questions.length
        }
      }
    })
    return
  }

  const benchmarkMatch = matchesPath(pathname, /^\/api\/evaluation\/benchmarks\/([^/]+)$/)
  if (benchmarkMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const benchmarkId = benchmarkMatch[1]
    const benchmark = Object.values(state.benchmarks)
      .flat()
      .find((item) => item.benchmark_id === benchmarkId)
    if (!benchmark) {
      sendJson(res, 404, { message: 'not found' })
      return
    }
    sendJson(res, 200, { message: 'success', data: clone(benchmark) })
    return
  }

  if (benchmarkMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    for (const dbId of Object.keys(state.benchmarks)) {
      state.benchmarks[dbId] = state.benchmarks[dbId].filter(
        (item) => item.benchmark_id !== benchmarkMatch[1]
      )
    }
    sendJson(res, 200, { message: 'success' })
    return
  }

  const benchmarkGenerateMatch = matchesPath(
    pathname,
    /^\/api\/evaluation\/databases\/([^/]+)\/benchmarks\/generate$/
  )
  if (benchmarkGenerateMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = benchmarkGenerateMatch[1]
    const body = await parseRequestBody(req)
    const questionCount = Number(body.count || 5)
    const benchmark = {
      benchmark_id: `benchmark-${randomUUID().slice(0, 8)}`,
      name: body.name || `自动生成基准 ${state.benchmarks[dbId]?.length || 0 + 1}`,
      description: body.description || '由 mock 自动生成的评估基准',
      question_count: questionCount,
      created_at: createTimestamp(),
      updated_at: createTimestamp(),
      questions: Array.from({ length: questionCount }, (_, index) => ({
        question: `自动生成问题 ${index + 1}`,
        answer: `自动生成答案 ${index + 1}`,
        context: 'Mock benchmark context',
        reference_answer: `参考答案 ${index + 1}`
      }))
    }
    state.benchmarks[dbId] = state.benchmarks[dbId] || []
    state.benchmarks[dbId].unshift(benchmark)
    const task = createTask(`评估基准生成 (${dbId})`, 'evaluation_generate', '评估基准已生成', {
      db_id: dbId,
      benchmark_id: benchmark.benchmark_id
    })
    sendJson(res, 200, { message: 'success', task_id: task.id, data: clone(benchmark) })
    return
  }

  const benchmarkUploadMatch = matchesPath(
    pathname,
    /^\/api\/evaluation\/databases\/([^/]+)\/benchmarks\/upload$/
  )
  if (benchmarkUploadMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = benchmarkUploadMatch[1]
    const body = await parseRequestBody(req)
    const fields = body.fields || {}
    const benchmark = {
      benchmark_id: `benchmark-${randomUUID().slice(0, 8)}`,
      name: fields.name || '上传基准',
      description: fields.description || '通过 mock 上传的评估基准',
      question_count: 3,
      created_at: createTimestamp(),
      updated_at: createTimestamp(),
      questions: [
        {
          question: '上传得到的示例问题 1',
          answer: '示例答案 1',
          context: 'mock upload',
          reference_answer: '示例答案 1'
        }
      ]
    }
    state.benchmarks[dbId] = state.benchmarks[dbId] || []
    state.benchmarks[dbId].unshift(benchmark)
    sendJson(res, 200, { message: 'success', data: clone(benchmark) })
    return
  }

  const runEvaluationMatch = matchesPath(
    pathname,
    /^\/api\/evaluation\/databases\/([^/]+)\/run$/
  )
  if (runEvaluationMatch && method === 'POST') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = runEvaluationMatch[1]
    const body = await parseRequestBody(req)
    const evaluation = {
      task_id: `eval-${randomUUID().slice(0, 8)}`,
      status: 'success',
      started_at: createTimestamp(),
      completed_at: createTimestamp(),
      total_questions: 3,
      completed_questions: 3,
      overall_score: 0.88,
      retrieval_config: {
        top_k: 5,
        rerank: true
      },
      benchmark_id: body.benchmark_id,
      results: clone(state.evaluations['kb-demo-milvus']?.[0]?.results || [])
    }
    state.evaluations[dbId] = state.evaluations[dbId] || []
    state.evaluations[dbId].unshift(evaluation)
    createTask(`RAG 评估 (${dbId})`, 'evaluation_run', '评估任务已完成', {
      db_id: dbId,
      task_id: evaluation.task_id
    })
    sendJson(res, 200, { message: 'success', data: { task_id: evaluation.task_id } })
    return
  }

  const evaluationResultsDbMatch = matchesPath(
    pathname,
    /^\/api\/evaluation\/databases\/([^/]+)\/results\/([^/]+)$/
  )
  if (evaluationResultsDbMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = evaluationResultsDbMatch[1]
    const taskId = evaluationResultsDbMatch[2]
    const evaluation = (state.evaluations[dbId] || []).find((item) => item.task_id === taskId)
    if (!evaluation) {
      sendJson(res, 404, { message: 'not found' })
      return
    }
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('page_size') || '10')
    const errorOnly = searchParams.get('error_only') === 'true'
    const sourceResults = errorOnly
      ? evaluation.results.filter((item) => (item.metrics?.score || 0) < 0.8)
      : evaluation.results
    const start = (page - 1) * pageSize
    const pagedResults = sourceResults.slice(start, start + pageSize)
    sendJson(res, 200, {
      message: 'success',
      data: {
        ...clone(evaluation),
        results: pagedResults,
        pagination: {
          page,
          page_size: pageSize,
          total: sourceResults.length
        }
      }
    })
    return
  }

  if (evaluationResultsDbMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = evaluationResultsDbMatch[1]
    const taskId = evaluationResultsDbMatch[2]
    state.evaluations[dbId] = (state.evaluations[dbId] || []).filter((item) => item.task_id !== taskId)
    sendJson(res, 200, { message: 'success' })
    return
  }

  const evaluationResultsMatch = matchesPath(pathname, /^\/api\/evaluation\/([^/]+)\/results$/)
  if (evaluationResultsMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const evaluation = Object.values(state.evaluations)
      .flat()
      .find((item) => item.task_id === evaluationResultsMatch[1])
    if (!evaluation) {
      sendJson(res, 404, { message: 'not found' })
      return
    }
    sendJson(res, 200, { message: 'success', data: clone(evaluation) })
    return
  }

  const evaluationDeleteMatch = matchesPath(pathname, /^\/api\/evaluation\/([^/]+)$/)
  if (evaluationDeleteMatch && method === 'DELETE') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    for (const dbId of Object.keys(state.evaluations)) {
      state.evaluations[dbId] = state.evaluations[dbId].filter(
        (item) => item.task_id !== evaluationDeleteMatch[1]
      )
    }
    sendJson(res, 200, { message: 'success' })
    return
  }

  const evaluationHistoryMatch = matchesPath(
    pathname,
    /^\/api\/evaluation\/databases\/([^/]+)\/history$/
  )
  if (evaluationHistoryMatch && method === 'GET') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    const dbId = evaluationHistoryMatch[1]
    sendJson(res, 200, { message: 'success', data: clone(state.evaluations[dbId] || []) })
    return
  }

  if (method === 'GET' && /^\/mock-files\//.test(pathname)) {
    const filename = decodeURIComponent(pathname.split('/').pop() || 'mock.txt')
    sendText(res, 200, `${filename} 的 mock 文件内容。\n该内容用于前端独立运行时的演示。`)
    return
  }

  sendJson(res, 404, { detail: `Mock route not found: ${method} ${pathname}` })
}

export const createDevMockPlugin = ({ enabled }) => ({
  name: 'yuxi-dev-mock-server',
  configureServer(server) {
    if (!enabled) {
      return
    }

    server.middlewares.use(async (req, res, next) => {
      if (!req.url || (!req.url.startsWith('/api') && !req.url.startsWith('/mock-files'))) {
        next()
        return
      }

      try {
        await handleMockApi(req, res)
      } catch (error) {
        console.error('[mock] request failed:', error)
        sendJson(res, 500, { detail: error.message || 'Mock server error' })
      }
    })
  }
})
