const PATTERN_LABELS: Record<string, string> = {
	'env-files': 'Environment files (.env)',
	'pem-files': 'Key material (.pem, .key)',
	'ssh-keys': 'SSH private keys',
	'aws-credentials': 'AWS credential files',
	'gcp-credentials': 'GCP credential files',
	'kube-config': 'Kubernetes config',
	'docker-config': 'Docker config',
	'npmrc': 'npm credentials (.npmrc)',
	'npmrc-files': 'npm credentials (.npmrc)',
	'netrc': 'netrc credentials',
	'pypirc': 'PyPI credentials (.pypirc)',
};

const PATTERN_SHORT_LABELS: Record<string, string> = {
	'env-files': '.env files',
	'pem-files': 'certificates',
	'key-files': 'private keys',
	'ssh-keys': 'SSH keys',
	'aws-credentials': 'AWS credentials',
	'gcp-credentials': 'GCP credentials',
	'kube-config': 'kubeconfig',
	'docker-config': 'Docker config',
	'npmrc': '.npmrc credentials',
	'npmrc-files': '.npmrc credentials',
	'netrc': '.netrc credentials',
	'pypirc': '.pypirc credentials',
	'android-keystore': 'Android keystores',
	'pkcs12-p12': 'PKCS#12 keystores',
	'terraform-vars': 'Terraform vars',
	'db-dumps': 'database dumps',
	'local-databases': 'local databases',
};

const IGNORE_LABELS: Record<string, string> = {
	'agents-md': 'AGENTS.md',
	'ai-exclude': '.aiexclude',
	'aider-ignore': '.aiderignore',
	'claude-ignore': '.claudeignore',
	'claude-md': 'CLAUDE.md',
	'cline-ignore': '.clineignore',
	'codeium-ignore': '.codeiumignore',
	'cody-ignore': '.codyignore',
	'continue-ignore': '.continueignore',
	'copilot-exclude': '.copilotignore',
	'cursor-ignore': '.cursorignore',
	'cursor-indexing-ignore': '.cursorindexingignore',
	'cursor-project-rules': 'Cursor project rules',
	'gemini-ignore': '.geminiignore',
	'git-ignore': '.gitignore',
	'llm-ignore': '.llmignore',
	'roo-ignore': '.rooignore',
	'zed-ignore': '.zedignore',
};

const SEVERITY_LABELS: Record<string, string> = {
	required: 'Required',
	recommended: 'Recommended',
	informational: 'Info',
};

const SEVERITY_RANK: Record<string, number> = {
	required: 0,
	recommended: 1,
	informational: 2,
};

export function formatSeverityLabel(severity: string): string {
	return SEVERITY_LABELS[severity] ?? severity;
}

export function severityRank(severity: string): number {
	return SEVERITY_RANK[severity] ?? 3;
}

function humanizeId(id: string): string {
	return id
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function formatPatternLabel(id: string): string {
	return PATTERN_LABELS[id] ?? humanizeId(id);
}

export function formatPatternShort(id: string): string {
	return PATTERN_SHORT_LABELS[id] ?? formatPatternLabel(id);
}

export function formatIgnoreLabel(id: string): string {
	return IGNORE_LABELS[id] ?? humanizeId(id);
}
