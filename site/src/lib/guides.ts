export type GuideFaq = { q: string; a: string };

export type PatternGuide = {
	id: string;
	slug: string;
	title: string;
	metaTitle: string;
	examples: string[];
	severity: 'required' | 'recommended' | 'informational';
	category: string;
	summary: string;
	whatItIs: string;
	whyAiContext: string;
	howToFix: string[];
	ignoreSnippet: string;
	relatedIgnore: string[];
	faq: GuideFaq[];
};

export type IgnoreGuide = {
	id: string;
	slug: string;
	filename: string;
	tool: string;
	metaTitle: string;
	summary: string;
	whatItIs: string;
	whyUseIt: string;
	howToCreate: string;
	example: string;
	docsUrl?: string;
	faq: GuideFaq[];
};

const UNIVERSAL_IGNORE = ['cursorignore', 'claudeignore', 'geminiignore', 'copilotignore'];

export const PATTERN_GUIDES: PatternGuide[] = [
	{
		id: 'env-files',
		slug: 'env-files',
		title: 'Environment files (.env)',
		metaTitle: 'How to keep .env files out of AI tools',
		examples: ['.env', '.env.local', '.env.development', '.env.production'],
		severity: 'required',
		category: 'secret',
		summary:
			'.env files hold environment variables — frequently API keys, database URLs, and tokens. When one sits in a repo, AI coding tools can read it as workspace context.',
		whatItIs:
			'An environment file stores configuration as KEY=value pairs. In real projects it usually contains database credentials, third-party API keys, signing secrets, and other values an application needs at runtime.',
		whyAiContext:
			'AI coding assistants index the files in your workspace to answer questions and generate code. If a real .env is present (not a .env.example placeholder), its secret values can be pulled into prompts, sent to model providers, or echoed back inside completions.',
		howToFix: [
			'Keep only a .env.example with placeholder values in version control.',
			'Add .env and .env.* to .gitignore so real files are never committed.',
			'Add the same patterns to a dedicated AI ignore file so assistants skip them even when the file exists locally.',
			'Rotate any secret that may already have been committed to history.',
		],
		ignoreSnippet: '.env\n.env.*\n!.env.example',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Should I commit .env files to git?',
				a: 'No. Commit a .env.example with placeholder keys instead, and keep real .env files out of version control entirely.',
			},
			{
				q: 'Does .gitignore stop AI tools from reading .env?',
				a: 'Not reliably. Some assistants read files on disk regardless of git status, so add .env to a dedicated AI ignore file as well.',
			},
		],
	},
	{
		id: 'key-files',
		slug: 'key-files',
		title: 'Private keys (.key)',
		metaTitle: 'Keeping private key files out of AI context',
		examples: ['*.key', 'private.key', 'server.key'],
		severity: 'required',
		category: 'secret',
		summary:
			'Files ending in .key usually hold private cryptographic keys for TLS, signing, or authentication — material that should never reach an AI assistant.',
		whatItIs:
			'A .key file typically contains a private key in PEM or DER form, used for TLS certificates, code signing, JWT signing, or SSH. Anyone with the key can impersonate the service or decrypt its traffic.',
		whyAiContext:
			'If a private key sits in the working tree, an AI tool can read its contents, include it in context windows, or surface fragments in generated code or logs. Private keys are among the highest-impact secrets to expose.',
		howToFix: [
			'Never commit private keys; store them in a secrets manager or environment-specific vault.',
			'Add *.key (and specific filenames) to .gitignore.',
			'Add the same patterns to your AI ignore file so assistants skip them.',
			'Rotate and reissue any key that has been committed or shared.',
		],
		ignoreSnippet: '*.key\n*.pem\nsecrets/',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'What is the risk of an AI tool reading a private key?',
				a: 'The key can leak into prompts sent to a model provider or appear in generated output. A leaked private key generally must be rotated immediately.',
			},
		],
	},
	{
		id: 'pem-files',
		slug: 'pem-files',
		title: 'Certificates and PEM keys (.pem)',
		metaTitle: 'Excluding .pem certificates and keys from AI tools',
		examples: ['*.pem', 'cert.pem', 'privkey.pem'],
		severity: 'required',
		category: 'secret',
		summary:
			'.pem files store certificates and keys in a base64 PEM container. They often include private keys, which AI assistants should never index.',
		whatItIs:
			'PEM is a text encoding used for X.509 certificates, RSA/EC private keys, and certificate chains. A single .pem can hold a public certificate, a private key, or both.',
		whyAiContext:
			'Because PEM files commonly bundle private keys, an assistant that reads them can pull signing or TLS secrets into its context. Public certificates are low risk, but the file format makes it hard to tell them apart automatically.',
		howToFix: [
			'Separate public certificates from private keys and keep private material out of the repo.',
			'Add *.pem to .gitignore unless a file is verified to be a public certificate only.',
			'Add *.pem to your AI ignore file to keep private keys out of assistant context.',
			'Rotate any private key found in committed PEM files.',
		],
		ignoreSnippet: '*.pem\n*.key\ncerts/',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Are all .pem files sensitive?',
				a: 'No — a .pem can be a public certificate. But because the format also carries private keys, treat .pem as sensitive unless you have confirmed otherwise.',
			},
		],
	},
	{
		id: 'npmrc-files',
		slug: 'npmrc-files',
		title: 'npm credentials (.npmrc)',
		metaTitle: 'Keeping .npmrc tokens out of AI assistants',
		examples: ['.npmrc'],
		severity: 'recommended',
		category: 'secret',
		summary:
			'A project .npmrc can contain registry auth tokens (_authToken). When it is committed, both registries and AI tools can read those credentials.',
		whatItIs:
			'.npmrc configures npm — registries, scopes, and authentication. A line like //registry.npmjs.org/:_authToken=... grants publish and install rights to private packages.',
		whyAiContext:
			'An AI assistant indexing the repo can read the auth token from .npmrc and surface it in context or completions. The token can be used to publish or download private packages.',
		howToFix: [
			'Keep auth tokens in a user-level ~/.npmrc or CI secret, not the project file.',
			'Use environment variable references (${NPM_TOKEN}) in a committed .npmrc instead of literal tokens.',
			'Add .npmrc to .gitignore if it ever contains literal credentials.',
			'Add .npmrc to your AI ignore file as a precaution.',
		],
		ignoreSnippet: '.npmrc',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Can I commit .npmrc at all?',
				a: 'Yes, if it only contains non-secret config or environment variable references. Never commit a literal _authToken.',
			},
		],
	},
	{
		id: 'ssh-keys',
		slug: 'ssh-keys',
		title: 'SSH private keys',
		metaTitle: 'Hiding SSH private keys from AI coding tools',
		examples: ['id_rsa', 'id_ed25519', '*.ppk'],
		severity: 'required',
		category: 'secret',
		summary:
			'SSH private keys (id_rsa, id_ed25519) grant access to servers and git remotes. They should never live in a repo an AI tool can read.',
		whatItIs:
			'An SSH private key authenticates you to remote servers and git hosts. The matching .pub file is public; the private key is the secret that must be protected.',
		whyAiContext:
			'If a private SSH key is checked into the working tree, an assistant can read it as context. A leaked key allows an attacker to authenticate as you until it is revoked.',
		howToFix: [
			'Keep SSH keys in ~/.ssh, never inside a project directory.',
			'Add id_rsa, id_ed25519, and *.ppk to .gitignore.',
			'Add the same names to your AI ignore file.',
			'Revoke and regenerate any key that was committed.',
		],
		ignoreSnippet: 'id_rsa\nid_ed25519\n*.ppk\n.ssh/',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Is the .pub file sensitive too?',
				a: 'No, the public key is meant to be shared. Only the private key (no extension or .ppk) must be protected.',
			},
		],
	},
	{
		id: 'aws-credentials',
		slug: 'aws-credentials',
		title: 'AWS credential files',
		metaTitle: 'Keeping AWS credentials out of AI context',
		examples: ['.aws/credentials', 'credentials'],
		severity: 'required',
		category: 'cloud',
		summary:
			'AWS credential files store access keys that grant programmatic access to cloud accounts. Exposure to an AI tool can lead to account takeover.',
		whatItIs:
			'The AWS credentials file holds aws_access_key_id and aws_secret_access_key pairs per profile. These keys can create, read, and delete cloud resources within their permissions.',
		whyAiContext:
			'An assistant that reads a committed credentials file can leak long-lived access keys. Attackers routinely scan for these keys, and exposure often results in resource abuse or data loss.',
		howToFix: [
			'Store credentials in ~/.aws/credentials, not the project.',
			'Prefer short-lived credentials (SSO, IAM roles) over long-lived keys.',
			'Add credentials and .aws/ to .gitignore.',
			'Add the same to your AI ignore file, and rotate any exposed key.',
		],
		ignoreSnippet: '.aws/\ncredentials',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'What should I do if an AWS key was exposed?',
				a: 'Deactivate and delete the key in IAM immediately, rotate to a new one, and review CloudTrail for unexpected activity.',
			},
		],
	},
	{
		id: 'android-keystore',
		slug: 'android-keystore',
		title: 'Android keystores (.jks, .keystore)',
		metaTitle: 'Excluding Android keystores from AI tools',
		examples: ['*.jks', '*.keystore', 'release.keystore'],
		severity: 'recommended',
		category: 'signing',
		summary:
			'Android keystores hold the signing keys used to publish apps. A leaked release keystore can let an attacker ship updates as you.',
		whatItIs:
			'A Java keystore (.jks or .keystore) stores the private signing key for an Android app. Google Play uses this key to verify that updates come from the original developer.',
		whyAiContext:
			'If a keystore is committed, an assistant can read the binary as context, and the file (often alongside its password in gradle config) can be extracted from history. Recovering app signing keys is difficult.',
		howToFix: [
			'Keep release keystores out of the repo; store them in a secure secrets vault.',
			'Add *.jks and *.keystore to .gitignore.',
			'Add the same patterns to your AI ignore file.',
			'Never commit keystore passwords in gradle.properties.',
		],
		ignoreSnippet: '*.jks\n*.keystore\nkeystore.properties',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Why is the signing key so important?',
				a: 'It is the identity Google Play uses for your app. Losing control of it can let someone push malicious updates to your users.',
			},
		],
	},
	{
		id: 'pkcs12-p12',
		slug: 'pkcs12-p12',
		title: 'PKCS#12 keystores (.p12, .pfx)',
		metaTitle: 'Keeping .p12 and .pfx keystores out of AI tools',
		examples: ['*.p12', '*.pfx'],
		severity: 'recommended',
		category: 'signing',
		summary:
			'PKCS#12 files (.p12, .pfx) bundle a certificate with its private key — common for code signing and client authentication.',
		whatItIs:
			'PKCS#12 is a binary archive format that packages a private key together with its certificate chain, usually protected by a password. It is widely used for TLS client certs and code-signing identities.',
		whyAiContext:
			'Because a .p12 contains a private key, an assistant reading it (or its password from nearby config) can expose signing material. These files should be treated like any other private key.',
		howToFix: [
			'Store .p12/.pfx identities in a secrets manager, not the repo.',
			'Add *.p12 and *.pfx to .gitignore.',
			'Add the same patterns to your AI ignore file.',
			'Rotate certificates whose keystore may have leaked.',
		],
		ignoreSnippet: '*.p12\n*.pfx',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Is a password-protected .p12 safe to commit?',
				a: 'No. Passwords are often weak or stored nearby, and committing the file still exposes it to anything that reads the repo, including AI tools.',
			},
		],
	},
	{
		id: 'terraform-vars',
		slug: 'terraform-vars',
		title: 'Terraform variable files (.tfvars)',
		metaTitle: 'Keeping .tfvars secrets out of AI assistants',
		examples: ['*.tfvars', 'terraform.tfvars', '*.auto.tfvars'],
		severity: 'recommended',
		category: 'cloud',
		summary:
			'.tfvars files supply values to Terraform — often including provider credentials, passwords, and connection strings.',
		whatItIs:
			'Terraform variable files set input values for infrastructure code. Teams frequently put real secrets (database passwords, API tokens, cloud keys) into .tfvars for convenience.',
		whyAiContext:
			'An AI assistant indexing the repo can read secret values from .tfvars and surface them in context. State files (.tfstate) carry the same risk and should be excluded too.',
		howToFix: [
			'Pass secrets via environment variables (TF_VAR_*) or a secrets backend instead of files.',
			'Add *.tfvars and *.tfstate to .gitignore.',
			'Add the same patterns to your AI ignore file.',
			'Commit only example tfvars with placeholder values.',
		],
		ignoreSnippet: '*.tfvars\n!example.tfvars\n*.tfstate\n*.tfstate.*',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Do I also need to ignore Terraform state?',
				a: 'Yes. .tfstate often contains secret values in plain text and should be kept out of both git and AI context.',
			},
		],
	},
	{
		id: 'db-dumps',
		slug: 'db-dumps',
		title: 'Database dumps (.sql)',
		metaTitle: 'Keeping database dumps out of AI tools',
		examples: ['*.sql', 'dump.sql', 'backup.sql'],
		severity: 'informational',
		category: 'pii',
		summary:
			'SQL dumps can contain production data — including personal information — that should not be indexed by an AI assistant.',
		whatItIs:
			'A database dump is an export of schema and rows, used for backups or local seeding. Real dumps often include user records, emails, and other personal or sensitive data.',
		whyAiContext:
			'When a dump sits in the repo, an assistant can read its rows as context, pulling personal data into prompts sent to model providers. This can create privacy and compliance issues.',
		howToFix: [
			'Keep production dumps out of the repo; use anonymized seed data for development.',
			'Add *.sql dumps (or a dedicated dumps/ folder) to .gitignore.',
			'Add the same to your AI ignore file.',
			'Scrub personal data from any sample data you do commit.',
		],
		ignoreSnippet: '*.sql\ndumps/\n*.dump',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'Are schema-only .sql files a problem?',
				a: 'Schema files are usually fine to commit. The risk is dumps that include real rows of personal or sensitive data.',
			},
		],
	},
	{
		id: 'local-databases',
		slug: 'local-databases',
		title: 'Local database files (.sqlite)',
		metaTitle: 'Excluding local .sqlite databases from AI tools',
		examples: ['*.sqlite', '*.db', '*.sqlite3'],
		severity: 'informational',
		category: 'pii',
		summary:
			'Local database files like .sqlite can hold real application data — sometimes copied from production — that an AI tool should not read.',
		whatItIs:
			'SQLite and similar single-file databases store an application’s data on disk. During development they often accumulate real or production-like records.',
		whyAiContext:
			'If a database file is committed, an assistant can read its contents as binary or text context, exposing whatever records it contains. These files also bloat the repo and indexing.',
		howToFix: [
			'Keep working databases out of version control.',
			'Add *.sqlite, *.sqlite3, and *.db to .gitignore.',
			'Add the same patterns to your AI ignore file.',
			'Use migrations and seed scripts to recreate local data instead.',
		],
		ignoreSnippet: '*.sqlite\n*.sqlite3\n*.db',
		relatedIgnore: UNIVERSAL_IGNORE,
		faq: [
			{
				q: 'What if my app needs a checked-in database?',
				a: 'Commit only a small fixture with synthetic data, and exclude any database that may contain real or production records.',
			},
		],
	},
];

export const IGNORE_GUIDES: IgnoreGuide[] = [
	{
		id: 'cursor-ignore',
		slug: 'cursorignore',
		filename: '.cursorignore',
		tool: 'Cursor',
		metaTitle: 'What is .cursorignore and how to use it',
		summary:
			'.cursorignore tells the Cursor editor which files to keep out of AI features — chat, edits, and codebase indexing.',
		whatItIs:
			'.cursorignore is a gitignore-style file at the root of your project. Cursor uses it to exclude matching files from AI access, so the assistant does not read or index them.',
		whyUseIt:
			'It is the most direct way to keep secrets, large assets, and noise out of Cursor’s context. Unlike .gitignore, it is read specifically by the AI features, so it applies even to files that are not in git.',
		howToCreate:
			'Create a file named .cursorignore in your project root and add one glob pattern per line, just like .gitignore. Cursor picks it up automatically.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		docsUrl: 'https://docs.cursor.com/context/ignore-files',
		faq: [
			{
				q: 'How is .cursorignore different from .cursorindexingignore?',
				a: '.cursorignore blocks files from all AI features, while .cursorindexingignore only excludes them from background indexing but still allows manual access.',
			},
			{
				q: 'Does .cursorignore use the same syntax as .gitignore?',
				a: 'Yes. It uses the same glob and negation (!) syntax, so you can reuse familiar patterns.',
			},
		],
	},
	{
		id: 'cursor-indexing-ignore',
		slug: 'cursorindexingignore',
		filename: '.cursorindexingignore',
		tool: 'Cursor',
		metaTitle: 'What is .cursorindexingignore in Cursor',
		summary:
			'.cursorindexingignore excludes files from Cursor’s background indexing while still letting you reference them manually.',
		whatItIs:
			'.cursorindexingignore is a gitignore-style file that controls Cursor’s codebase indexing. Files it matches are not embedded for semantic search, but remain accessible if you add them explicitly.',
		whyUseIt:
			'Use it for large, generated, or noisy files you want to keep out of search results without fully blocking the assistant. For secrets, prefer .cursorignore, which blocks access entirely.',
		howToCreate:
			'Create .cursorindexingignore in your project root and list patterns to skip during indexing, one per line.',
		example: 'dist/\nbuild/\n*.min.js\nvendor/',
		docsUrl: 'https://docs.cursor.com/context/ignore-files',
		faq: [
			{
				q: 'Should I use this for secrets?',
				a: 'No. Indexing-ignore still allows manual access. For secrets use .cursorignore so the files are blocked from all AI features.',
			},
		],
	},
	{
		id: 'cursor-project-rules',
		slug: 'cursor-project-rules',
		filename: '.cursor/rules',
		tool: 'Cursor',
		metaTitle: 'Cursor project rules for safer AI context',
		summary:
			'Cursor project rules (.cursor/rules) give the assistant persistent, project-specific instructions — including guidance to avoid sensitive paths.',
		whatItIs:
			'Project rules are Markdown files under .cursor/rules that Cursor injects into the model’s context. They steer how the assistant behaves in your codebase.',
		whyUseIt:
			'Rules are not an access control, but they complement ignore files: you can instruct the assistant to never request or echo secret paths, and to follow your hygiene conventions.',
		howToCreate:
			'Add a .cursor/rules directory and create one or more .mdc rule files describing conventions and constraints for the project.',
		example: '# Hygiene\nNever read or echo .env, *.key, or *.pem files.\nTreat anything under secrets/ as off-limits.',
		docsUrl: 'https://docs.cursor.com/context/rules',
		faq: [
			{
				q: 'Do rules replace .cursorignore?',
				a: 'No. Rules guide behavior but do not enforce access. Use .cursorignore to actually block sensitive files, and rules to reinforce the convention.',
			},
		],
	},
	{
		id: 'claude-ignore',
		slug: 'claudeignore',
		filename: '.claudeignore',
		tool: 'Claude',
		metaTitle: 'What is .claudeignore and how to use it',
		summary:
			'.claudeignore lists files that Claude-based coding assistants should skip when reading your project for context.',
		whatItIs:
			'.claudeignore is a gitignore-style file used by Claude-powered tools to exclude matching files from the assistant’s view of your codebase.',
		whyUseIt:
			'It keeps secrets and irrelevant files out of Claude’s context window, reducing the chance that sensitive values are read or repeated. It applies independently of .gitignore.',
		howToCreate:
			'Create .claudeignore in your project root and add one glob pattern per line for the files Claude should not read.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Is .claudeignore the same as CLAUDE.md?',
				a: 'No. .claudeignore excludes files from context, while CLAUDE.md provides instructions and project memory that Claude reads.',
			},
		],
	},
	{
		id: 'claude-md',
		slug: 'claude-md',
		filename: 'CLAUDE.md',
		tool: 'Claude Code',
		metaTitle: 'What is CLAUDE.md and how to use it',
		summary:
			'CLAUDE.md is a project memory and instructions file that Claude Code reads automatically to understand your conventions.',
		whatItIs:
			'CLAUDE.md is a Markdown file at the project root (or in subfolders) that Claude Code loads as persistent context — describing architecture, commands, and rules for the assistant.',
		whyUseIt:
			'It improves answer quality and lets you encode hygiene conventions, such as instructing the assistant to avoid reading or echoing secret files. It pairs well with .claudeignore for actual exclusion.',
		howToCreate:
			'Create a CLAUDE.md in your project root and document setup commands, conventions, and any files the assistant should treat as off-limits.',
		example: '# Project notes\n\n## Hygiene\nDo not read or print .env, *.key, or *.pem files.',
		faq: [
			{
				q: 'Does CLAUDE.md block access to files?',
				a: 'No. It provides instructions, not enforcement. Use .claudeignore to actually exclude sensitive files from context.',
			},
		],
	},
	{
		id: 'agents-md',
		slug: 'agents-md',
		filename: 'AGENTS.md',
		tool: 'AI agents (open standard)',
		metaTitle: 'What is AGENTS.md and how to use it',
		summary:
			'AGENTS.md is an open convention for giving AI coding agents project-specific instructions in a single Markdown file.',
		whatItIs:
			'AGENTS.md is a standard file that many AI agents read to learn how to work in your repository — build commands, test commands, conventions, and constraints.',
		whyUseIt:
			'A single AGENTS.md works across multiple tools that support the convention, so you maintain one set of instructions instead of per-tool files. You can use it to document hygiene rules for agents.',
		howToCreate:
			'Create AGENTS.md in your project root and describe how agents should build, test, and behave, including any sensitive paths to avoid.',
		example: '# AGENTS.md\n\n## Conventions\nUse pnpm. Run `pnpm test` before finishing.\n\n## Off-limits\nNever read .env or files under secrets/.',
		docsUrl: 'https://agents.md',
		faq: [
			{
				q: 'Which tools read AGENTS.md?',
				a: 'A growing set of AI coding agents support the convention. Check your tool’s docs, and combine AGENTS.md with a dedicated ignore file for enforcement.',
			},
		],
	},
	{
		id: 'gemini-ignore',
		slug: 'geminiignore',
		filename: '.geminiignore',
		tool: 'Gemini CLI',
		metaTitle: 'What is .geminiignore and how to use it',
		summary:
			'.geminiignore tells the Gemini CLI which files to exclude from the context it reads about your project.',
		whatItIs:
			'.geminiignore is a gitignore-style file used by Google’s Gemini CLI to skip matching files when building context for the model.',
		whyUseIt:
			'It keeps secrets and noise out of Gemini’s view of your codebase, applied specifically to the AI tool rather than to git.',
		howToCreate:
			'Create .geminiignore in your project root and add one glob pattern per line for files Gemini should not read.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		docsUrl: 'https://github.com/google-gemini/gemini-cli',
		faq: [
			{
				q: 'Is .geminiignore related to .aiexclude?',
				a: 'They serve a similar purpose for Google’s AI tools. .aiexclude is used by Gemini in IDEs such as Android Studio and Firebase, while .geminiignore is used by the Gemini CLI.',
			},
		],
	},
	{
		id: 'ai-exclude',
		slug: 'aiexclude',
		filename: '.aiexclude',
		tool: 'Gemini in IDEs',
		metaTitle: 'What is .aiexclude and how to use it',
		summary:
			'.aiexclude blocks files from Gemini’s AI features in IDEs such as Android Studio and Firebase Studio.',
		whatItIs:
			'.aiexclude is a gitignore-style file that Gemini-powered IDE features honor to keep matching files out of AI context and suggestions.',
		whyUseIt:
			'It prevents Gemini from reading sensitive files when generating code or answering questions inside the IDE, independent of .gitignore.',
		howToCreate:
			'Create .aiexclude in your project root (or a subdirectory) and list patterns to exclude, one per line.',
		example: '.env\n*.pem\n*.key\nkeystore.properties',
		faq: [
			{
				q: 'Does an empty .aiexclude do anything?',
				a: 'In some implementations an empty .aiexclude blocks the whole directory. Add explicit patterns to control exactly what is excluded.',
			},
		],
	},
	{
		id: 'copilot-exclude',
		slug: 'copilotignore',
		filename: '.copilotignore',
		tool: 'GitHub Copilot',
		metaTitle: 'How to exclude files from GitHub Copilot',
		summary:
			'GitHub Copilot can be told to ignore files via content exclusions; some setups also use a .copilotignore file.',
		whatItIs:
			'Copilot content exclusions define files and paths that Copilot should not use as context or for suggestions. They are configured in repository or organization settings, and some community tooling reads a .copilotignore file.',
		whyUseIt:
			'Excluding secrets and sensitive paths keeps them out of Copilot suggestions and context. It is the supported way to limit what Copilot can see in a repository.',
		howToCreate:
			'For official content exclusions, configure them in your repository or organization settings under Copilot. Where supported, add a .copilotignore with gitignore-style patterns.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		docsUrl:
			'https://docs.github.com/en/copilot/managing-copilot/configuring-and-troubleshooting-github-copilot/configuring-content-exclusions-for-github-copilot',
		faq: [
			{
				q: 'Is .copilotignore an official file?',
				a: 'Official exclusions are configured in GitHub settings (content exclusions). A .copilotignore file is used by some community tools — check what your setup supports.',
			},
		],
	},
	{
		id: 'aider-ignore',
		slug: 'aiderignore',
		filename: '.aiderignore',
		tool: 'Aider',
		metaTitle: 'What is .aiderignore and how to use it',
		summary:
			'.aiderignore tells the Aider CLI which files to exclude from the chat context and edits.',
		whatItIs:
			'.aiderignore is a gitignore-style file that Aider reads to skip matching files when adding repository context or making changes.',
		whyUseIt:
			'It keeps secrets and large files out of Aider’s context, which also reduces token usage and avoids accidental edits to sensitive files.',
		howToCreate:
			'Create .aiderignore in your project root and add one glob pattern per line for files Aider should ignore.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		docsUrl: 'https://aider.chat/docs/config/options.html',
		faq: [
			{
				q: 'Does Aider already respect .gitignore?',
				a: 'Aider focuses on tracked files, but .aiderignore lets you add extra exclusions specific to the assistant.',
			},
		],
	},
	{
		id: 'codeium-ignore',
		slug: 'codeiumignore',
		filename: '.codeiumignore',
		tool: 'Codeium / Windsurf',
		metaTitle: 'What is .codeiumignore and how to use it',
		summary:
			'.codeiumignore excludes files from Codeium’s indexing and AI context across its editor integrations.',
		whatItIs:
			'.codeiumignore is a gitignore-style file used by Codeium (and Windsurf) to keep matching files out of indexing and suggestions.',
		whyUseIt:
			'It prevents secrets and noise from being indexed or used as context, applied specifically to the AI tool.',
		howToCreate:
			'Create .codeiumignore in your project root and list patterns to exclude, one per line.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Where does .codeiumignore go?',
				a: 'Place it at the root of your workspace so it applies to the whole project.',
			},
		],
	},
	{
		id: 'cline-ignore',
		slug: 'clineignore',
		filename: '.clineignore',
		tool: 'Cline',
		metaTitle: 'What is .clineignore and how to use it',
		summary:
			'.clineignore tells the Cline VS Code agent which files to exclude from its context and actions.',
		whatItIs:
			'.clineignore is a gitignore-style file that the Cline autonomous coding agent reads to skip matching files when exploring or editing your project.',
		whyUseIt:
			'Because Cline can read and modify files autonomously, excluding secrets keeps them out of its context and protects them from accidental edits.',
		howToCreate:
			'Create .clineignore in your project root and add one glob pattern per line for files Cline should not touch.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Why does an autonomous agent need an ignore file?',
				a: 'Autonomous agents act on the codebase directly, so an ignore file is an important guardrail for sensitive files.',
			},
		],
	},
	{
		id: 'continue-ignore',
		slug: 'continueignore',
		filename: '.continueignore',
		tool: 'Continue',
		metaTitle: 'What is .continueignore and how to use it',
		summary:
			'.continueignore excludes files from the Continue assistant’s indexing and context.',
		whatItIs:
			'.continueignore is a gitignore-style file used by the Continue extension to skip matching files when building context and codebase retrieval.',
		whyUseIt:
			'It keeps secrets and irrelevant files out of Continue’s context and embeddings, applied independently of git.',
		howToCreate:
			'Create .continueignore in your project root and add patterns to exclude, one per line.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		docsUrl: 'https://docs.continue.dev',
		faq: [
			{
				q: 'Does Continue respect .gitignore too?',
				a: 'Continue generally skips gitignored files, and .continueignore adds assistant-specific exclusions on top.',
			},
		],
	},
	{
		id: 'cody-ignore',
		slug: 'codyignore',
		filename: '.cody/ignore',
		tool: 'Sourcegraph Cody',
		metaTitle: 'How Cody ignore files work',
		summary:
			'Cody can be configured to ignore files so they are excluded from context used by Sourcegraph’s assistant.',
		whatItIs:
			'Cody ignore configuration lists files and paths that Sourcegraph Cody should not use as context for chat or completions.',
		whyUseIt:
			'Excluding secrets and sensitive paths keeps them out of Cody’s context. Check your Cody version for the exact ignore mechanism, as it has evolved over time.',
		howToCreate:
			'Configure Cody’s context filters or ignore file as documented for your version, listing the paths to exclude.',
		example: '.env\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Has Cody’s ignore mechanism changed?',
				a: 'Yes, it has evolved across versions. Consult the current Sourcegraph Cody docs for the exact configuration your version supports.',
			},
		],
	},
	{
		id: 'roo-ignore',
		slug: 'rooignore',
		filename: '.rooignore',
		tool: 'Roo Code',
		metaTitle: 'What is .rooignore and how to use it',
		summary:
			'.rooignore tells the Roo Code agent which files to exclude from its context and edits.',
		whatItIs:
			'.rooignore is a gitignore-style file used by the Roo Code VS Code agent to skip matching files when reading or modifying your project.',
		whyUseIt:
			'As an autonomous agent, Roo benefits from an ignore file that keeps secrets out of context and prevents accidental changes to sensitive files.',
		howToCreate:
			'Create .rooignore in your project root and add one glob pattern per line.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Is .rooignore syntax the same as .gitignore?',
				a: 'Yes, it uses familiar gitignore-style glob patterns.',
			},
		],
	},
	{
		id: 'zed-ignore',
		slug: 'zedignore',
		filename: '.zedignore',
		tool: 'Zed',
		metaTitle: 'Excluding files from Zed AI features',
		summary:
			'Zed can exclude files from its AI features so sensitive paths are not used as context.',
		whatItIs:
			'Zed’s file exclusion settings (and gitignore handling) control which files the editor’s AI assistant can read for context.',
		whyUseIt:
			'Excluding secrets keeps them out of Zed’s assistant context. Configure exclusions so sensitive files are never sent to the model.',
		howToCreate:
			'Use Zed’s settings to exclude sensitive paths from AI features, or rely on .gitignore plus explicit exclusions for files that must stay out of context.',
		example: '.env\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Does Zed honor .gitignore for AI context?',
				a: 'Zed respects gitignore for many features; add explicit exclusions for any sensitive file that is not gitignored.',
			},
		],
	},
	{
		id: 'llm-ignore',
		slug: 'llmignore',
		filename: '.llmignore',
		tool: 'Generic LLM tools',
		metaTitle: 'What is .llmignore',
		summary:
			'.llmignore is a tool-agnostic convention for listing files that LLM-based tools should exclude from context.',
		whatItIs:
			'.llmignore is a gitignore-style file adopted by some LLM tooling as a neutral, vendor-independent way to declare files that should never be sent to a model.',
		whyUseIt:
			'A single .llmignore can document intent across tools that support it, signaling which files are off-limits for any AI assistant.',
		howToCreate:
			'Create .llmignore in your project root and add patterns to exclude, one per line. Pair it with the specific ignore file your tool reads for enforcement.',
		example: '.env\n.env.*\n*.pem\n*.key\nsecrets/',
		faq: [
			{
				q: 'Do all AI tools read .llmignore?',
				a: 'No. Support varies. Use it as a clear signal, but also add the dedicated ignore file your specific tool honors.',
			},
		],
	},
];

const PATTERN_BY_SLUG = new Map(PATTERN_GUIDES.map((g) => [g.slug, g]));
const PATTERN_BY_ID = new Map(PATTERN_GUIDES.map((g) => [g.id, g]));
const IGNORE_BY_SLUG = new Map(IGNORE_GUIDES.map((g) => [g.slug, g]));
const IGNORE_BY_ID = new Map(IGNORE_GUIDES.map((g) => [g.id, g]));

export function getPatternGuides(): PatternGuide[] {
	return PATTERN_GUIDES;
}

export function getIgnoreGuides(): IgnoreGuide[] {
	return IGNORE_GUIDES;
}

export function getPatternGuideBySlug(slug: string): PatternGuide | undefined {
	return PATTERN_BY_SLUG.get(slug);
}

export function getIgnoreGuideBySlug(slug: string): IgnoreGuide | undefined {
	return IGNORE_BY_SLUG.get(slug);
}

export function patternGuideSlugById(id: string): string | undefined {
	return PATTERN_BY_ID.get(id)?.slug;
}

export function ignoreGuideSlugById(id: string): string | undefined {
	return IGNORE_BY_ID.get(id)?.slug;
}

export function getIgnoreGuidesBySlugs(slugs: string[]): IgnoreGuide[] {
	return slugs.map((slug) => IGNORE_BY_SLUG.get(slug)).filter((g): g is IgnoreGuide => Boolean(g));
}
