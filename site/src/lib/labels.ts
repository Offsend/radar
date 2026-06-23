const PATTERN_LABELS: Record<string, string> = {
	'env-files': 'Environment files (.env)',
	'pem-files': 'Key material (.pem, .key)',
	'ssh-keys': 'SSH private keys',
	'aws-credentials': 'AWS credential files',
	'gcp-credentials': 'GCP credential files',
	'kube-config': 'Kubernetes config',
	'docker-config': 'Docker config',
	'npmrc': 'npm credentials (.npmrc)',
	'netrc': 'netrc credentials',
	'pypirc': 'PyPI credentials (.pypirc)',
};

const IGNORE_LABELS: Record<string, string> = {
	'agents-md': 'AGENTS.md',
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
	'git-ignore': '.gitignore (AI-related)',
	'llm-ignore': '.llmignore',
	'roo-ignore': '.rooignore',
	'zed-ignore': '.zedignore',
};

function humanizeId(id: string): string {
	return id
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function formatPatternLabel(id: string): string {
	return PATTERN_LABELS[id] ?? humanizeId(id);
}

export function formatIgnoreLabel(id: string): string {
	return IGNORE_LABELS[id] ?? humanizeId(id);
}
