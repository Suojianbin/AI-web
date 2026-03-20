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
      description: '负责 Ai-Know 平台研发与维护',
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
            'Ai-Know 是一个结合 RAG 与知识图谱能力的智能知识平台，适合企业私有知识管理。',
          lines: [
            'Ai-Know 是一个结合 RAG 与知识图谱能力的智能知识平台。',
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
      content: 'Ai-Know',
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
        { id: 'platform', name: 'Ai-Know', type: 'platform' },
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
        name: 'Ai-know',
        logo: '/favicon.svg',
        avatar: '/avatar.jpg',
        login_bg: '/login-bg.jpg'
      },
      branding: {
        name: 'Ai-Know',
        title: 'Ai-Know 独立前端演示',
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
          url: ''
        },
        {
          name: '项目文档',
          icon: 'docs',
          url: ''
        }
      ],
      footer: {
        copyright: '© Ai-Know 2026 mock web standalone'
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
        name: 'Ai-docs',
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
      'Ai-docs': [
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

const findThreadWithAgentById = (threadId) => {
  if (!threadId) return null
  for (const [agentId, threadList] of Object.entries(state.threads)) {
    const thread = threadList.find((item) => item.id === threadId)
    if (thread) {
      return { agentId, thread }
    }
  }
  return null
}

const inferAgentIdFromUser = (user) => {
  const userText = String(user || '')
  if (userText.startsWith('simple-')) {
    const inferred = userText.slice('simple-'.length).trim()
    if (inferred) return inferred
  }
  return state.defaultAgentId || 'knowledge-assistant'
}

const ensureThreadForDifyConversation = (conversationId, user, query = '') => {
  const existed = findThreadWithAgentById(conversationId)
  if (existed?.thread) return existed.thread

  const agentId = inferAgentIdFromUser(user)
  const createdAt = createTimestamp()
  const thread = {
    id: conversationId || `thread-${randomUUID().slice(0, 8)}`,
    agent_id: agentId,
    title: (String(query || '').trim().slice(0, 30) || '新的对话'),
    description: '',
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
      high_level: ['Ai-Know', '知识图谱'],
      low_level: query.split(/\s+/).filter(Boolean).slice(0, 3)
    }
  },
  data: {
    entities: [
      {
        entity_name: 'Ai-Know',
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
        src_id: 'Ai-Know',
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const sendSSEHeaders = (res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }
}

const writeSSE = (res, payload, eventName = '') => {
  if (res.writableEnded) return
  if (eventName) {
    res.write(`event: ${eventName}\n`)
  }
  const dataText = typeof payload === 'string' ? payload : JSON.stringify(payload)
  for (const line of dataText.split('\n')) {
    res.write(`data: ${line}\n`)
  }
  res.write('\n')
}

const writeSSEEventOnly = (res, eventName) => {
  if (res.writableEnded) return
  if (eventName) {
    res.write(`event: ${eventName}\n`)
  }
  res.write('\n')
}

const splitDifyAnswerChunks = (text) => {
  const chunks = []
  let index = 0
  while (index < text.length) {
    const left = text.length - index
    const size = Math.min(left, Math.max(1, Math.floor(Math.random() * 6) + 1))
    chunks.push(text.slice(index, index + size))
    index += size
  }
  return chunks
}

const createDifyMockAnswer = (query, files = []) => {
  const q = String(query || '')
  const lower = q.toLowerCase()
  const safeFiles = Array.isArray(files) ? files : []

  if (safeFiles.length > 0) {
    const filesSummary = safeFiles
      .map((file, index) => {
        const name = String(file?.name || `file-${index + 1}`)
        const size = Number(file?.size || 0)
        const kb = size > 0 ? `${(size / 1024).toFixed(1)}KB` : '未知大小'
        return `${index + 1}. ${name} (${kb})`
      })
      .join('\n')

    const firstTextLike = safeFiles.find((file) => String(file?.text_excerpt || '').trim())
    const firstExcerpt = firstTextLike
      ? String(firstTextLike.text_excerpt || '')
          .replace(/\r\n/g, '\n')
          .slice(0, 320)
      : ''

    return [
      `已收到并解析 ${safeFiles.length} 个文件：`,
      filesSummary,
      '',
      firstExcerpt
        ? `以下是文件内容片段（模拟解析）：\n\n\`\`\`text\n${firstExcerpt}\n\`\`\``
        : '当前文件为二进制或无可提取文本，已完成元数据解析。',
      '',
      '你可以继续提问，比如：请总结这批文件的重点、生成提纲或提取行动项。'
    ].join('\n')
  }

  if (lower.includes('代码块') || lower.includes('code block') || lower.includes('code')) {
    return [
      '下面是一个代码块示例，你可以测试右上角“复制代码”按钮：',
      '',
      '```javascript',
      'function greet(name) {',
      "  return `Hello, ${name}!`",
      '}',
      '',
      "console.log(greet('Dify'));",
      '```',
      '',
      '如果你希望，我也可以输出 Python / Java / SQL 版本。'
    ].join('\n')
  }

  if (lower.includes('公式') || lower.includes('数学') || lower.includes('latex')) {
    return [
      '下面给你一个本地 mock 的数学示例：',
      '',
      '- 行内公式：$E = mc^2$',
      '- 块级公式：',
      '',
      '$$\\int_{0}^{1} x^2\\,dx = \\frac{1}{3}$$',
      '',
      '如果你继续发带公式的 Markdown，前端会继续按公式渲染。'
    ].join('\n')
  }

  if (lower.includes('图片') || lower.includes('image') || lower.includes('img')) {
    return [
      '可以显示图片，下面是一个示例 Markdown 图片：',
      '',
      '![Mock Image](https://picsum.photos/seed/dify-mock/960/420)',
      '',
      '如果你传入的是可访问 URL，聊天气泡里会直接渲染。'
    ].join('\n')
  }

  return `这是本地 Dify Mock 的流式回复：已收到你的问题“${q}”。\n\n你现在不依赖真实 Dify 服务，也能联调打字机、Markdown、公式和图片渲染。`
}

const handleDifyChatMessages = async (req, res) => {
  const body = await parseRequestBody(req)
  const query = String(body?.query || '').trim()
  if (!query) {
    sendJson(res, 400, { code: 'invalid_param', message: 'query 不能为空' })
    return
  }

  const conversationId = String(body?.conversation_id || randomUUID())
  const messageId = randomUUID()
  const taskId = randomUUID()
  const workflowRunId = randomUUID()
  const startNodeRunId = randomUUID()
  const llmNodeRunId = randomUUID()
  const answerNodeRunId = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const startedAtMs = Date.now()
  const user = String(body?.user || 'mock-dify-user')
  const workflowId = 'mock-dify-workflow'
  const appId = 'mock-dify-app'
  const inputFiles = Array.isArray(body?.files)
    ? body.files.map((file, index) => ({
        id: file?.id || `file-${index + 1}`,
        name: String(file?.name || `file-${index + 1}`),
        size: Number(file?.size || 0),
        mime_type: String(file?.mime_type || 'application/octet-stream'),
        extension: String(file?.extension || ''),
        text_excerpt: String(file?.text_excerpt || ''),
        type: String(file?.type || 'document')
      }))
    : []
  const answer = createDifyMockAnswer(query, inputFiles)
  const chunks = splitDifyAnswerChunks(answer)

  const thread = ensureThreadForDifyConversation(conversationId, user, query)
  if (thread) {
    if ((thread.title === '新的对话' || !thread.title) && query) {
      thread.title = query.slice(0, 30)
    }

    thread.messages.push({
      id: `human-${randomUUID().slice(0, 8)}`,
      type: 'human',
      content: query,
      created_at: createTimestamp()
    })

    thread.messages.push({
      id: messageId,
      type: 'ai',
      content: answer,
      created_at: createTimestamp(),
      tool_calls: []
    })

    if (inputFiles.length > 0) {
      thread.agent_state = {
        ...(thread.agent_state || {}),
        files: inputFiles.map((file) => ({
          summary: {
            name: file.name,
            path: createSourcePath(file.name)
          }
        }))
      }
    }

    thread.updated_at = createTimestamp()
  }

  const promptTokens = Math.max(1, Math.ceil(query.length / 2))
  const completionTokens = Math.max(1, Math.ceil(answer.length / 2))
  const totalTokens = promptTokens + completionTokens
  const totalPrice = Number((promptTokens * 0.0000005 + completionTokens * 0.000002).toFixed(6))

  sendSSEHeaders(res)
  writeSSEEventOnly(res, 'ping')
  await wait(12)

  writeSSE(res, {
    event: 'workflow_started',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: workflowRunId,
      workflow_id: workflowId,
      inputs: {
        'sys.files': inputFiles,
        'sys.user_id': user,
        'sys.app_id': appId,
        'sys.workflow_id': workflowId,
        'sys.workflow_run_id': workflowRunId,
        'sys.query': query
      },
      created_at: now,
      reason: 'initial'
    }
  })

  await wait(24)

  writeSSE(res, {
    event: 'node_started',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: startNodeRunId,
      node_id: 'start',
      node_type: 'start',
      title: '用户输入',
      index: 1,
      predecessor_node_id: null,
      inputs: null,
      inputs_truncated: false,
      created_at: now,
      extras: {},
      iteration_id: null,
      loop_id: null,
      agent_strategy: null
    }
  })

  await wait(18)

  writeSSE(res, {
    event: 'node_finished',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: startNodeRunId,
      node_id: 'start',
      node_type: 'start',
      title: '用户输入',
      index: 1,
      predecessor_node_id: null,
      inputs: {
        'sys.files': inputFiles,
        'sys.user_id': user,
        'sys.app_id': appId,
        'sys.workflow_id': workflowId,
        'sys.workflow_run_id': workflowRunId,
        'sys.query': query,
        'sys.conversation_id': conversationId,
        'sys.dialogue_count': 1
      },
      inputs_truncated: false,
      process_data: {},
      process_data_truncated: false,
      outputs: {
        'sys.files': inputFiles,
        'sys.user_id': user,
        'sys.app_id': appId,
        'sys.workflow_id': workflowId,
        'sys.workflow_run_id': workflowRunId,
        'sys.query': query,
        'sys.conversation_id': conversationId,
        'sys.dialogue_count': 1
      },
      outputs_truncated: false,
      status: 'succeeded',
      error: null,
      elapsed_time: 0.02,
      execution_metadata: null,
      created_at: now,
      finished_at: now,
      files: [],
      iteration_id: null,
      loop_id: null
    }
  })

  await wait(16)

  writeSSE(res, {
    event: 'node_started',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: llmNodeRunId,
      node_id: 'llm',
      node_type: 'llm',
      title: 'LLM',
      index: 1,
      predecessor_node_id: null,
      inputs: null,
      inputs_truncated: false,
      created_at: now,
      extras: {},
      iteration_id: null,
      loop_id: null,
      agent_strategy: null
    }
  })

  await wait(20)

  let isFirstChunk = true
  for (const chunk of chunks) {
    writeSSE(res, {
      event: 'message',
      conversation_id: conversationId,
      message_id: messageId,
      created_at: now,
      task_id: taskId,
      id: messageId,
      answer: chunk,
      from_variable_selector: ['llm', 'text']
    })

    await wait(isFirstChunk ? 90 : 35)
    isFirstChunk = false
  }

  const elapsed = Number(((Date.now() - startedAtMs) / 1000).toFixed(3))
  const ttfb = 0.12
  const timeToGenerate = Number(Math.max(0.01, elapsed - ttfb).toFixed(3))

  writeSSE(res, {
    event: 'node_finished',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: llmNodeRunId,
      node_id: 'llm',
      node_type: 'llm',
      title: 'LLM',
      index: 1,
      predecessor_node_id: null,
      inputs: {},
      inputs_truncated: false,
      process_data: {
        model_mode: 'chat',
        prompts: [{ files: [], role: 'user', text: `${query}\n\n` }],
        usage: {
          completion_price: Number((completionTokens * 0.000002).toFixed(6)),
          completion_price_unit: '0.001',
          completion_tokens: completionTokens,
          completion_unit_price: '0.002',
          currency: 'RMB',
          latency: elapsed,
          prompt_price: Number((promptTokens * 0.0000005).toFixed(6)),
          prompt_price_unit: '0.001',
          prompt_tokens: promptTokens,
          prompt_unit_price: '0.0005',
          time_to_first_token: ttfb,
          time_to_generate: timeToGenerate,
          total_price: totalPrice,
          total_tokens: totalTokens
        },
        finish_reason: 'stop',
        model_provider: 'langgenius/mock',
        model_name: 'mock-model'
      },
      process_data_truncated: false,
      outputs: {
        text: answer,
        reasoning_content: '',
        usage: {
          completion_price: Number((completionTokens * 0.000002).toFixed(6)),
          completion_price_unit: '0.001',
          completion_tokens: completionTokens,
          completion_unit_price: '0.002',
          currency: 'RMB',
          latency: elapsed,
          prompt_price: Number((promptTokens * 0.0000005).toFixed(6)),
          prompt_price_unit: '0.001',
          prompt_tokens: promptTokens,
          prompt_unit_price: '0.0005',
          time_to_first_token: ttfb,
          time_to_generate: timeToGenerate,
          total_price: totalPrice,
          total_tokens: totalTokens
        },
        finish_reason: 'stop'
      },
      outputs_truncated: false,
      status: 'succeeded',
      error: null,
      elapsed_time: elapsed,
      execution_metadata: {
        total_tokens: totalTokens,
        total_price: totalPrice,
        currency: 'RMB'
      },
      created_at: now,
      finished_at: Math.floor(Date.now() / 1000),
      files: [],
      iteration_id: null,
      loop_id: null
    }
  })

  writeSSE(res, {
    event: 'node_started',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: answerNodeRunId,
      node_id: 'answer',
      node_type: 'answer',
      title: '直接回复',
      index: 1,
      predecessor_node_id: null,
      inputs: null,
      inputs_truncated: false,
      created_at: now,
      extras: {},
      iteration_id: null,
      loop_id: null,
      agent_strategy: null
    }
  })

  writeSSE(res, {
    event: 'node_finished',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: answerNodeRunId,
      node_id: 'answer',
      node_type: 'answer',
      title: '直接回复',
      index: 1,
      predecessor_node_id: null,
      inputs: {},
      inputs_truncated: false,
      process_data: {},
      process_data_truncated: false,
      outputs: {
        answer,
        files: []
      },
      outputs_truncated: false,
      status: 'succeeded',
      error: null,
      elapsed_time: Number(timeToGenerate.toFixed(3)),
      execution_metadata: null,
      created_at: now,
      finished_at: Math.floor(Date.now() / 1000),
      files: [],
      iteration_id: null,
      loop_id: null
    }
  })

  writeSSE(res, {
    event: 'message_end',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    id: messageId,
    metadata: {
      annotation_reply: null,
      retriever_resources: [],
      usage: {
        prompt_tokens: promptTokens,
        prompt_unit_price: '0.0005',
        prompt_price_unit: '0.001',
        prompt_price: Number((promptTokens * 0.0000005).toFixed(6)),
        completion_tokens: completionTokens,
        completion_unit_price: '0.002',
        completion_price_unit: '0.001',
        completion_price: Number((completionTokens * 0.000002).toFixed(6)),
        total_tokens: totalTokens,
        total_price: totalPrice,
        currency: 'RMB',
        latency: elapsed,
        time_to_first_token: ttfb,
        time_to_generate: timeToGenerate
      }
    },
    files: []
  })

  writeSSE(res, {
    event: 'workflow_finished',
    conversation_id: conversationId,
    message_id: messageId,
    created_at: now,
    task_id: taskId,
    workflow_run_id: workflowRunId,
    data: {
      id: workflowRunId,
      workflow_id: workflowId,
      status: 'succeeded',
      outputs: {
        answer,
        files: []
      },
      error: null,
      elapsed_time: elapsed,
      total_tokens: totalTokens,
      total_steps: 3,
      created_by: {
        id: user,
        name: 'Dify',
        email: 'mock@example.com'
      },
      created_at: now,
      finished_at: Math.floor(Date.now() / 1000),
      exceptions_count: 0,
      files: []
    }
  })

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

  /*
    Dify Mock 接口：POST /mock-dify/v1/chat-messages
    描述：模拟 Dify /v1/chat-messages 的 streaming SSE 返回，用于本地联调。
  */
  if (
    method === 'POST' &&
    (pathname === '/mock-dify/v1/chat-messages' || pathname === '/v1/chat-messages')
  ) {
    await handleDifyChatMessages(req, res)
    return
  }

  /*
    接口说明：POST /api/chat/agent/:agentId
    描述：模拟智能体对话流（stream-like），用于前端展示流式分块响应行为。
    请求：Content-Type 可为 application/json 或 multipart/form-data，body 包含：
      - query: string, 用户输入的问题
      - config: object, 可选，包含 thread_id 等对话上下文信息
    返回：以文本流（每行 JSON）形式返回若干 chunk，常见 status 有：init, AIMessageChunk, agent_state, finished
    权限：需要登录（Authorization: Bearer <token>）
    用例：用于聊天页面的 SSE 或流式渲染测试。
  */
  if (method === 'POST' && /^\/api\/chat\/agent\/[^/]+$/.test(pathname)) {
    await handleChatStream(req, res, pathname)
    return
  }

  /*
    接口说明：POST /api/chat/agent/:agentId/resume
    描述：模拟审批恢复（resume）流式接口，前端用于审批后继续执行或终止操作的演示。
    请求体：{ thread_id, approved } 其中 approved 为布尔值
    返回：流式响应，包含审批结果与后续 AI 消息
    权限：需要登录
  */
  if (method === 'POST' && /^\/api\/chat\/agent\/[^/]+\/resume$/.test(pathname)) {
    await handleResumeStream(req, res, pathname)
    return
  }

  /*
    接口说明：GET /api/system/health
    描述：系统健康检查接口，前端启动时用于确认 mock 服务可用性。
    请求参数：无
    返回示例：{ status: 'ok', message: 'mock server ready' }
    权限：公开
  */
  if (method === 'GET' && pathname === '/api/system/health') {
    sendJson(res, 200, { status: 'ok', message: 'mock server ready' })
    return
  }

  /*
    接口说明：GET /api/system/info
    描述：返回系统配置信息、品牌与功能开关，供前端初始化使用。
    返回数据结构与 createInitialState().infoConfig 对应，包含 organization, branding, features 等。
    权限：公开
  */
  if (method === 'GET' && pathname === '/api/system/info') {
    sendJson(res, 200, { success: true, data: clone(state.infoConfig) })
    return
  }

  /*
    接口说明：POST /api/system/info/reload
    描述：重新加载系统信息（mock 环境直接返回当前 infoConfig）。
    用途：前端调试时触发配置重载。
    权限：公开
  */
  if (method === 'POST' && pathname === '/api/system/info/reload') {
    sendJson(res, 200, { success: true, data: clone(state.infoConfig) })
    return
  }

  /*
    接口说明：GET /api/auth/check-first-run
    描述：检查是否为首次运行（无用户时返回 true），用于安装/初始化流程判断。
    返回：{ first_run: boolean }
    权限：公开
  */
  if (method === 'GET' && pathname === '/api/auth/check-first-run') {
    sendJson(res, 200, { first_run: state.users.length === 0 })
    return
  }

  /*
    接口说明：POST /api/auth/initialize
    描述：初始化第一个管理员账户（演示用）。
    请求体（JSON）：{ user_id?, password?, phone_number? }
    返回：带有 access_token 的用户信息（buildTokenPayload）
    权限：公开（用于首次配置）
  */
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

  /*
    接口说明：POST /api/auth/token
    描述：用户名密码登录接口，支持 application/json 或表单提交。
    请求体：{ username, password }
    返回：{ access_token, token_type, user_id, username, ... }
    权限：公开
  */
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

  /*
    接口说明：GET /api/auth/me
    描述：获取当前登录用户信息（需 Authorization）。
    返回：用户基本信息（buildUserPayload），不包含密码。
    权限：需要登录
  */
  if (method === 'GET' && pathname === '/api/auth/me') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, buildUserPayload(auth.user))
    return
  }

  /*
    接口说明：PUT /api/auth/profile
    描述：更新当前用户的基础资料（用户名、手机号等）。
    请求体：{ username?, phone_number? }
    返回：更新后的用户信息（buildUserPayload）
    权限：需要登录
  */
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

  /*
    接口说明：POST /api/auth/upload-avatar
    描述：上传并设置用户头像（mock 环境固定返回 /avatar.jpg）。
    请求：multipart/form-data，字段名通常为 file
    返回：{ avatar_url }
    权限：需要登录
  */
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

  /*
    接口说明：GET /api/auth/users
    描述：列出所有用户，用于用户管理页面（仅管理员可访问）。
    返回：数组，每项为 buildUserPayload 输出（不含密码）。
    权限：需要管理员（admin）或超级管理员权限
  */
  if (method === 'GET' && pathname === '/api/auth/users') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, state.users.map(buildUserPayload))
    return
  }

  /*
    接口说明：POST /api/auth/users
    描述：创建新用户（管理员接口），请求体中应提供 username, password, role, department_id 等字段。
    返回：新创建的用户基本信息或完整用户对象视前端需要而定（mock 返回内部对象）。
    权限：需要管理员
  */
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

  /*
    接口说明：PUT /api/auth/users/:id
    描述：更新指定用户信息（用户名、手机号、角色、部门、密码等）。
    请求体：{ username?, phone_number?, role?, department_id?, password? }
    返回：更新后的用户信息载荷
    权限：管理员
    Mock 实现说明：在内存 state.users 中查找并更新目标用户。
  */
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

  /*
    接口说明：POST /api/auth/validate-username
    描述：根据输入用户名生成规范化的 user_id（用于前端表单校验与预览）。
    请求体：{ username: string }
    返回：{ user_id: string }
    权限：需要管理员（admin）权限
    说明：会把中文与字母数字混合名称规范化为下划线分隔的小写 ID。
  */
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

  /*
    接口说明：GET /api/auth/check-user-id/:userId
    描述：检查给定的 user_id 是否已存在（通常用于用户导入或精确校验）。
    路径参数：:userId（URL 编码）
    返回：{ is_available: boolean }
    权限：需要超级管理员（superadmin）权限
  */
  /*
    接口说明：GET /api/auth/check-user-id/:userId
    描述：检查给定的 user_id 是否已存在（用于前端用户名校验或检测冲突）。
    返回：{ exists: boolean }
    权限：公开（或需登录，视实现而定）
    Mock 实现说明：在 state.users 中查找 user_id 并返回布尔结果。
  */
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

  /*
    接口说明：GET /api/system/config
    描述：获取当前系统运行时配置项（如模型、嵌入、特性开关等），用于系统设置页面展示。
    返回：完整的 config 对象（state.config 的克隆），包含 default_model、embed_model、model_provider_status 等字段。
    权限：需要管理员权限
  */
  if (method === 'GET' && pathname === '/api/system/config') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, clone(state.config))
    return
  }

  /*
    接口说明：POST /api/system/config 或 POST /api/system/config/update
    描述：更新系统配置项。支持两种形式：
      - 单键更新：{ key, value }
      - 批量更新：直接传入 config 对象（会合并到现有配置）
    返回：更新后的完整 config 对象
    权限：需要管理员
    注意：此为 Mock 实现，变更仅影响内存中的 state.config
  */
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

  /*
    接口说明：GET /api/system/logs
    描述：获取系统运行日志（mock 返回示例日志），用于运维/调试页面。
    返回：{ logs: [{ level, message, created_at }, ...] }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/system/health/ocr
    描述：检查 OCR 子系统健康状态（Mock 返回 OK），用于 OCR 服务面板。
    返回：{ status: 'healthy'|'unhealthy', message: string }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/system/ocr/health
    描述：返回多个 OCR 子服务的健康状态详情（mock 返回示例数据）。
    返回：{ services: { <service>: { status, message }, ... } }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/system/ocr/stats
    描述：返回 OCR 服务的调用统计（示例：请求总数、成功率）。
    返回：{ total_requests: number, success_rate: number }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/system/chat-models/all/status
    描述：返回所有模型供应商（provider）的可用性状态，用于系统监控面板。
    返回：{ status: { <provider>: { status, message }, ... } }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/system/chat-models/status
    描述：返回当前默认聊天模型的总体状态（简要），用于前端快速检查。
    返回：{ status: { status: 'available'|'unavailable', message } }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/system/custom-providers
    描述：获取当前注册的自定义模型提供商（custom providers）列表，包含 provider_id、base_url、models 等信息。
    返回：对象映射 provider_id -> provider 配置
    权限：需要管理员
  */
  if (method === 'GET' && pathname === '/api/system/custom-providers') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, clone(state.customProviders))
    return
  }

  /*
    接口说明：POST /api/system/custom-providers
    描述：添加新的自定义模型提供商（用于接入自定义 LLM/代理），请求体需包含 provider_id 与 provider_data。
    请求体示例：{ provider_id: 'my_provider', provider_data: { name, base_url, models: [] } }
    返回：{ success: true, message }
    权限：需要管理员
    注意：仅影响 mock 内存数据 state.customProviders 与 state.config
  */
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

  /*
    接口说明：/api/system/custom-providers/:providerId  (GET | PUT | DELETE)
    描述：管理自定义模型/服务提供者配置（查询、更新、删除）。
    请求体（PUT）：提供 provider 配置字段（api_key、endpoint、name 等）
    返回：操作结果或 provider 详情
    权限：管理员
    Mock 实现说明：操作内存 state.customProviders，并返回模拟的 provider 信息。
  */
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

  /*
    接口说明：POST /api/system/custom-providers/:providerId/test
    描述：对指定自定义模型提供商执行连接测试（Mock 总是返回成功），用于设置页面的“连接测试”操作。
    路径参数：:providerId
    返回：{ success: true, message }
    权限：需要管理员
  */
  /*
    接口说明：POST /api/system/custom-providers/:providerId/test
    描述：测试自定义 provider 的连通性与配置有效性（例如验证 API key 是否可用）。
    请求体：通常为空或包含临时测试参数
    返回：{ status: 'ok'|'failed', message }
    权限：管理员
    Mock 实现说明：始终返回 success 或基于请求体模拟失败结果。
  */
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

  /*
    接口说明：GET /api/system/mcp-servers
    描述：列出已注册的 MCP 服务器（用于集成外部工具/服务），返回数组 data。
    返回：{ success: true, data: [ { name, transport, url, enabled, ... } ] }
    权限：需要管理员
  */
  if (method === 'GET' && pathname === '/api/system/mcp-servers') {
    const auth = requireAuthUser(req, { admin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { success: true, data: clone(state.mcpServers) })
    return
  }

  /*
    接口说明：POST /api/system/mcp-servers
    描述：创建一个新的 MCP 服务器配置（用于注册外部工具服务）。
    请求体示例：{ name, transport, url, headers?, timeout?, tags? }
    返回：{ success: true, message }
    权限：需要管理员
    注意：Mock 实现会把新服务器加入 state.mcpServers 并为其初始化空工具列表 state.mcpTools[name]
  */
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

  /*
    接口说明：GET /api/system/mcp-servers/:name
    描述：获取指定 MCP 服务器的配置信息。
    路径参数：:name（服务器名，URL 编码）
    返回：{ success: true, data: <serverObject> } 或 404
    权限：需要管理员
  */
  /*
    接口说明：/api/system/mcp-servers/:serverId  (GET | PUT | DELETE)
    描述：管理 MCP（模型调用平台）服务器配置，支持查询、更新与删除。
    权限：管理员
    Mock 实现说明：基于 state.mcpServers 提供模拟数据与开关行为。
  */
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

  /*
    接口说明：POST /api/system/mcp-servers/:name/test
    描述：对指定 MCP 服务器执行连通性测试（Mock 始终成功），用于运维/调试。
    路径参数：:name
    返回：{ success: true, message }
    权限：需要管理员
  */
  /*
    接口说明：POST /api/system/mcp-servers/:serverId/test
    描述：测试 MCP 服务器连通性与认证，返回测试结果。
    返回：{ status: 'ok'|'failed', message }
    权限：管理员
    Mock 实现说明：返回模拟的测试通过结果并写入日志。
  */
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

  /*
    接口说明：PUT /api/system/mcp-servers/:name/toggle
    描述：切换指定 MCP 服务器的启用状态（启用/禁用）。
    返回：{ success: true, message }
    权限：需要管理员
  */
  /*
    接口说明：POST /api/system/mcp-servers/:serverId/toggle
    描述：开关指定 MCP 服务器的启用状态（enable/disable）。
    返回：{ success: true, enabled: boolean }
    权限：管理员
    Mock 实现说明：切换 state.mcpServers 中对应项的 enabled 字段。
  */
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

  /*
    接口说明：GET /api/system/mcp-servers/:name/tools
    描述：列出指定 MCP 服务器注册的工具列表（mcpTools），返回 data 数组。
    权限：需要管理员
  */
  /*
    接口说明：GET /api/system/mcp-servers/:serverId/tools
    描述：列出 MCP 服务器上可用的工具或集成（例如外部工具、插件）。
    返回：工具列表
    权限：管理员
    Mock 实现说明：返回 state.mcpServers[serverId].tools 或示例工具数组。
  */
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

  /*
    接口说明：POST /api/system/mcp-servers/:serverId/tools/refresh
    描述：刷新 MCP 服务器上的工具列表（从远端或配置重新拉取）。
    返回：{ success: true }
    权限：管理员
    Mock 实现说明：更新内存中工具时间戳或返回成功。
  */
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

  /*
    接口说明：POST /api/system/mcp-servers/:serverId/tools/:toolId/toggle
    描述：启用或禁用指定 MCP 工具。
    返回：{ success: true, enabled: boolean }
    权限：管理员
    Mock 实现说明：切换 state.mcpServers[serverId].tools 中对应工具的 enabled 状态。
  */
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

  /*
    接口说明：GET /api/departments
    描述：列出所有部门信息（包含 id、name、description、user_count），用于组织管理页面。
    返回：数组
    权限：需要超级管理员（superadmin）
  */
  if (method === 'GET' && pathname === '/api/departments') {
    const auth = requireAuthUser(req, { superadmin: true })
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, clone(state.departments))
    return
  }

  /*
    接口说明：POST /api/departments
    描述：创建一个新部门，并为该部门生成一个管理员账户（演示用途）。
    请求体示例：{ name, description?, admin_user_id?, admin_password?, admin_phone? }
    返回：新建的部门对象
    权限：需要超级管理员
  */
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

  /*
    接口说明：/api/departments/:id  (GET | PUT | DELETE)
    描述：针对单个部门提供查询、更新与删除操作。路径参数 :id 为部门数字 ID。
    - GET 返回部门详情
    - PUT 接收 { name?, description? } 并更新部门，同时同步更新所属用户的 department_name
    - DELETE 删除部门并清理成员的 department 字段
    权限：需要超级管理员（superadmin）
  */
  /*
    部门管理接口说明：
    - GET /api/departments/:id
      描述：获取指定部门的详情
    - PUT /api/departments/:id
      描述：更新部门信息
    - DELETE /api/departments/:id
      描述：删除部门
    权限：管理员
    Mock 实现说明：基于 state.departments 实现 CRUD 操作并更新统计信息。
  */
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

  /*
    接口说明：GET /api/chat/default_agent
    描述：获取系统默认智能体 ID，前端用于聊天页面默认选中智能体。
    返回：{ default_agent_id: string }
    权限：需要登录
  */
  if (method === 'GET' && pathname === '/api/chat/default_agent') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { default_agent_id: state.defaultAgentId })
    return
  }

  /*
    接口说明：GET /api/chat/agent
    描述：获取可用智能体列表（简要信息），用于聊天侧边栏与智能体选择器。
    返回：{ agents: [ { id, name, description, capabilities, examples, has_checkpointer } ] }
    权限：需要登录
  */
  if (method === 'GET' && pathname === '/api/chat/agent') {
    const auth = requireAuthUser(req)
    if (auth.error) {
      sendJson(res, auth.error.status, auth.error.body)
      return
    }
    sendJson(res, 200, { agents: clone(state.agents) })
    return
  }

  /*
    接口说明：GET /api/chat/agent/:agentId/config
    描述：获取指定智能体的运行配置（如 system_prompt、model、tools 等），用于智能体配置页的回显。
    路径参数：:agentId
    返回：{ config: { system_prompt, model, tools, temperature, ... } }
    权限：需要管理员
  */
  /*
    接口说明：GET/PUT /api/chat/agent/:agentId/config
    描述：获取或更新指定 Agent 的运行配置（例如模型参数、记忆策略、工具开关等）。
    请求体（PUT）：agent 配置对象
    返回：配置详情
    权限：管理员或 agent 所属用户
    Mock 实现说明：在 state.agents 中读取或合并配置并返回。
  */
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

  /*
    接口说明：POST /api/chat/agent/:agentId/config
    描述：保存指定智能体的配置（管理员操作）。请求体为完整的 config 对象。
    请求体示例：{ system_prompt, model, tools, temperature }
    返回：{ success: true, config }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/chat/agent/:agentId
    描述：获取指定智能体的详细信息（包含 configurable_items、examples、capabilities 等），用于智能体详情页。
    路径参数：:agentId
    返回：智能体对象或 404
    权限：需要登录
  */
  /*
    接口说明：GET/PUT/DELETE /api/chat/agent/:agentId
    描述：查询、更新或删除 Agent（智能体）的元数据与配置
    权限：管理员（写操作）或登录用户（读取）
    Mock 实现说明：操作 state.agents 并返回构建的 agent 详情。
  */
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

  /*
    接口说明：POST /api/chat/set_default_agent
    描述：设置系统默认智能体 ID，管理员可通过此接口更改全局默认智能体。
    请求体：{ agent_id: string }
    返回：{ success: true, default_agent_id }
    权限：需要管理员
  */
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

  /*
    接口说明：GET /api/chat/models
    描述：获取指定模型提供商下可用的模型列表。
    查询参数：model_provider (可选，默认 'openai')
    返回：{ models: [string] }
    权限：需要登录
  */
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

  /*
    接口说明：POST /api/chat/models/update
    描述：更新指定模型提供商的模型列表（管理员操作）。
    查询参数：model_provider (可选)
    请求体：数组形式的模型标识列表，如 ["gpt-4o-mini", "gpt-4.1-mini"]
    返回：{ models: [...] }
    权限：需要管理员
  */
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

  /*
    接口说明：POST /api/chat/call
    描述：同步调用智能体（非流式），根据 query 返回单次完整回答，适用于某些同步 API 或表单测试。
    请求体：{ query: string }
    返回：{ answer: string }
    权限：需要登录
  */
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

  /*
    接口说明：GET /api/chat/agent/:agentId/history
    描述：获取指定对话线程的消息历史，通常通过 query 参数 thread_id 指定要查询的会话。
    查询参数：thread_id
    返回：{ history: [ { id, type, content, created_at, ... } ] }
    权限：需要登录
  */
  /*
    接口说明：GET /api/chat/agent/:agentId/history
    描述：获取指定 Agent 的会话历史或交互记录（分页）
    请求参数：page, page_size
    返回：{ items: [...], pagination }
    权限：登录用户
    Mock 实现说明：从 state.threads 或 agent 相关缓存中构造历史记录返回。
  */
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

  /*
    接口说明：GET /api/chat/agent/:agentId/state
    描述：获取指定对话线程的 agent_state（如 todos、files 等），用于展示会话内的结构化状态。
    查询参数：thread_id
    返回：{ agent_state: { todos: [], files: [] } }
    权限：需要登录
  */
  /*
    接口说明：GET/PUT /api/chat/agent/:agentId/state
    描述：获取或更新 Agent 的运行时状态（例如开启/关闭、上下文开关等）
    权限：管理员或 Agent 所属用户
    Mock 实现说明：读写 state.agents[agentId].state 或类似字段。
  */
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

  /*
    接口说明：POST /api/chat/message/:messageId/feedback
    描述：为指定消息提交用户反馈（like/dislike 与原因），并返回保存的反馈对象。
    请求体：{ rating: 'like'|'dislike', reason?: string }
    返回：feedback 对象
    权限：需要登录
  */
  /*
    接口说明：POST /api/chat/message/:messageId/feedback
    描述：提交针对某条消息的用户反馈（评分、是否有用等）。
    请求体：{ rating, comment? }
    返回：{ success: true }
    权限：登录用户
    Mock 实现说明：将反馈追加到 state.feedbacks 并返回成功。
  */
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

  /*
    接口说明：GET /api/chat/message/:messageId/feedback
    描述：查询指定消息的反馈记录（如果存在则返回已保存的反馈），用于反馈管理。
    返回：feedback 对象或 { rating: null, reason: null }
    权限：需要登录
  */
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

  /*
    接口说明：POST /api/chat/image/upload
    描述：上传图片并返回图片内容或 URL（Mock 返回 base64 示例），用于聊天中的图片发送功能。
    请求：multipart/form-data，文件字段通常为 file
    返回：{ success: true, imageContent: 'data:image/...' }
    权限：需要登录
  */
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

  /*
    接口说明：GET /api/chat/threads
    描述：获取指定智能体下的对话线程列表，查询参数 agent_id 可选（默认使用 state.defaultAgentId）。
    返回：数组，每项为线程摘要（id, title, messages, updated_at 等）
    权限：需要登录
  */
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

  /*
    接口说明：POST /api/chat/thread
    描述：创建新的对话线程，返回创建的 thread 对象。
    请求体：{ agent_id, title?, metadata? }
    返回：thread 对象
    权限：需要登录
  */
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

  /*
    接口说明：/api/chat/thread/:threadId  (PUT | DELETE)
    描述：针对单个对话线程提供更新和删除操作。
    - PUT 请求体可包含 { title?, description? }，返回更新后的 thread
    - DELETE 删除指定会话（需要登录权限）
    权限：需要登录（删除也仅限会话参与者或管理员）
  */
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

  /*
    接口说明：/api/chat/thread/:threadId/attachments[/:fileId]  (GET | POST | DELETE)
    描述：管理对话线程附件：
      - GET 返回 attachments 列表与上传限制
      - POST 接受 multipart/form-data 并把文件加入 thread.attachments
      - DELETE 删除指定附件（路径末尾带文件 ID）
    权限：需要登录
  */
  const threadAttachmentsMatch = matchesPath(
    pathname,
    /^\/api\/chat\/thread\/([^/]+)\/attachments(?:\/(?:[^/]+))?$/
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

  /*
    接口说明：GET /api/knowledge/databases
    描述：列出所有知识库（数据库）摘要信息，用于知识库管理与下拉选择。
    返回：{ databases: [ { db_id, name, description, kb_type, created_at, embed_info, files, metadata } ] }
    权限：需要管理员
  */
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

  /*
    接口说明：POST /api/knowledge/databases
    描述：创建新的知识库（数据库），请求体包含 name, kb_type, embed_model_name, llm_info 等可选字段。
    返回：新创建知识库的详细信息（buildDatabaseDetail）
    权限：需要管理员
    注意：Mock 中的数据保存在内存 state.databases
  */
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

  /*
    接口说明：POST /api/knowledge/generate-description
    描述：基于给定的知识库名称生成描述文本（Mock 通过模板返回示例描述），用于创建知识库时的自动描述生成。
    请求体：{ name }
    返回：{ description: string }
    权限：需要管理员
  */
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

  /*
    接口说明：/api/knowledge/databases/:dbId  (GET | PUT | DELETE)
    描述：针对单个知识库提供查询、更新与删除操作：
      - GET 返回知识库详细信息
      - PUT 更新 name、description、additional_params、llm_info 等字段
      - DELETE 删除知识库并清理相关内存数据
    权限：需要管理员
  */
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
  /*
    接口说明：POST /api/knowledge/databases/:dbId/documents/index
    描述：为指定知识库中的一组文档执行入库/索引操作，通常在文档解析完成后调用以将文档写入向量库或建立检索索引。
    请求体：{ file_ids: string[] } - 需要被索引的文件 ID 列表
    返回：{ status: 'queued', message: string, task_id: string }
    权限：管理员
    Mock 实现说明：将对应文件的 status 标记为 'indexed'，更新时间戳，并创建一个任务记录返回 task_id。
  */
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
  /*
    接口说明：POST /api/knowledge/databases/:dbId/query 或 /api/knowledge/databases/:dbId/query-test
    描述：对指定知识库执行检索查询，返回检索结果或测试用的示例结果。
    请求体：{ query: string, ... } - 查询文本以及可选的检索参数
    返回：根据知识库类型返回 RAG 检索结果的结构（包含候选文档、score、source 等字段）
    权限：登录用户（非特权用户亦可），管理员可获取更多信息
    Mock 实现说明：根据知识库类型 (lightrag / milvus) 返回示例结果，便于前端联调 UI。
  */
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
  /*
    接口说明：GET/PUT /api/knowledge/databases/:dbId/query-params
    描述：获取或更新知识库的查询参数模板（例如 top_k、rerank 等选项）。
    GET 返回：{ params: {...} }
    PUT 请求体：按键值对提供要更新的默认值，示例 { top_k: 5 }
    返回：{ message: 'success' }
    权限：管理员
    Mock 实现说明：GET 返回内存中的 queryParams，PUT 将传入值合并并保存为默认值。
  */
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
  /*
    接口说明：GET/POST /api/knowledge/databases/:dbId/sample-questions
    描述：管理知识库的示例问题列表，用于展示或快速生成查询示例。
    GET 返回：{ questions: string[] }
    POST 请求体：{ count: number } 表示生成的示例问题数量
    返回：{ questions: string[] }
    权限：管理员
    Mock 实现说明：GET 从内存 state.sampleQuestions 返回，POST 根据 count 生成占位示例问题并保存。
  */
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
    /*
      接口说明：POST /api/knowledge/files/upload
      描述：上传单个文件到临时存储，返回文件路径与 content_hash，供后续导入或解析使用。
      请求参数：URL 查询可包含 db_id 表示上传目标知识库
      请求体：multipart/form-data 或 JSON 模拟结构 { files: [{ filename, content }] }
      返回：{ file_path: string, content_hash: string, has_same_name?: boolean, same_name_files?: [] }
      权限：管理员
      Mock 实现说明：返回模拟的 file_path 与随机 content_hash；若目标知识库中存在同名文件，附带 has_same_name 标识与同名文件列表。
    */
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

  /*
    图谱相关接口组说明：
    - GET /api/graph/list
      描述：列出所有可用的图或图数据源（如 neo4j、样例图等），用于前端选择数据源。
      返回：{ success: true, data: [...] }
      权限：登录即可查看
    - GET /api/graph/subgraph
      描述：根据 db_id 与 node_label 查询子图数据（节点与边），返回用于前端渲染的 subgraph
      请求参数：db_id, node_label
    - GET /api/graph/stats
      描述：返回图的统计信息（节点数、边数）
    - GET /api/graph/labels
      描述：返回图中所有节点的标签（类型）
    - Neo4j 相关接口：/api/graph/neo4j/* 用于节点查询、导入、索引与信息查询，部分操作需管理员权限
    Mock 实现说明：所有接口基于内存 state.graphSubgraphs 返回示例数据，便于前端联调。
  */
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

  /*
    接口说明：POST /api/graph/neo4j/add-entities
    描述：上传或添加实体到 Neo4j 子图（模拟），通常用于将文件或外部实体导入图数据库。
    请求体：{ file_path: string } 或其他表示实体的字段
    返回：{ status: 'success', message }
    权限：管理员
    Mock 实现说明：将新实体追加到 state.graphSubgraphs.neo4j.nodes，并更新统计信息。
  */
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

  /*
    仪表盘 / Dashboard 相关接口组说明：
    - GET /api/dashboard/conversations
      描述：列出所有对话的汇总信息，用于仪表盘会话列表
      权限：管理员
    - GET /api/dashboard/conversations/:id
      描述：获取指定会话的详细内容
    - GET /api/dashboard/stats
      描述：返回整体仪表盘统计数据（会话量、活跃用户等）
    - GET /api/dashboard/feedbacks
      描述：列出用户反馈（可按 rating 或 agent_id 过滤）
    - GET /api/dashboard/stats/*
      描述：提供不同维度的统计（users, tools, knowledge, agents, calls 等）
    Mock 实现说明：基于内存 state.* 返回模拟统计与会话数据，便于前端展示组件联调。
  */
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

  /*
    任务管理接口组说明：
    - GET /api/tasks
      描述：列出系统中所有任务（导入、索引、评估等），并返回任务汇总
      返回：{ tasks: [...], summary: {...} }
      权限：管理员
    - GET /api/tasks/:id
      描述：获取指定任务的详细信息
    - POST /api/tasks/:id/cancel
      描述：取消指定任务（管理员权限）
    Mock 实现说明：使用内存 state.tasks 存储任务记录，允许取消操作修改任务状态。
  */
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

  /*
    评估与基准 (Evaluation) 接口组说明：
    - GET /api/evaluation/databases/:dbId/benchmarks
      描述：列出指定知识库的所有评估基准
    - GET/DELETE /api/evaluation/databases/:dbId/benchmarks/:benchmarkId
      描述：查看或删除指定基准
    - POST /api/evaluation/databases/:dbId/benchmarks/generate
      描述：基于知识库内容自动生成评估基准（示例问题/答案）
    - POST /api/evaluation/databases/:dbId/benchmarks/upload
      描述：上传基准文件并创建基准项
    - POST /api/evaluation/databases/:dbId/run
      描述：执行评估任务并返回任务 ID（评估会创建异步任务）
    - GET/DELETE /api/evaluation/databases/:dbId/results/:taskId
      描述：获取或删除指定评估任务的结果
    - GET /api/evaluation/:taskId/results
      描述：按任务 ID 查询评估结果
    Mock 实现说明：所有评估数据保存在内存 state.evaluations 与 state.benchmarks，中间会创建任务对象用于前端展示任务队列。
  */
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

  /*
    静态 Mock 文件与未匹配路由处理：
    - GET /mock-files/:filename
      描述：返回用于独立前端运行的示例/静态 mock 文件内容，方便演示与调试。
    - 未匹配路由会返回 404，并在控制台打印错误信息。
    Mock 实现说明：/mock-files 下的内容由 sendText 返回示例文本；所有未被识别的 /api 路径会落到文件尾部的 404 处理。
  */
  if (method === 'GET' && /^\/mock-files\//.test(pathname)) {
    const filename = decodeURIComponent(pathname.split('/').pop() || 'mock.txt')
    sendText(res, 200, `${filename} 的 mock 文件内容。\n该内容用于前端独立运行时的演示。`)
    return
  }

  sendJson(res, 404, { detail: `Mock route not found: ${method} ${pathname}` })
}

export const createDevMockPlugin = ({ enabled }) => ({
  name: 'Ai-dev-mock-server',
  configureServer(server) {
    if (!enabled) {
      return
    }

    server.middlewares.use(async (req, res, next) => {
      if (
        !req.url ||
        (!req.url.startsWith('/api') &&
          !req.url.startsWith('/mock-files') &&
          !req.url.startsWith('/mock-dify') &&
          !req.url.startsWith('/v1'))
      ) {
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
