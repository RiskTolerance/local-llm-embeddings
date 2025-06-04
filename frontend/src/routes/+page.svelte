<script lang="ts">
	let file = $state<File | null>(null);
	let uploadMessage = $state<string>('');
	let uploadChunks = $state<string[]>([]);
	let uploadSource = $state<string>('');
	let question = $state<string>('');
	let answer = $state<string>('');
	let error = $state<string>('');
	let loading = $state<boolean>(false);

	async function handleUpload(e: Event) {
		e.preventDefault();
		if (!file) {
			error = 'Please select a file.';
			return;
		}
		error = '';
		uploadMessage = '';
		uploadChunks = [];
		uploadSource = '';
		loading = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('http://localhost:3000/api/upload', {
				method: 'POST',
				body: formData
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Upload failed');
			uploadMessage = data.message;
			uploadChunks = data.chunks;
			uploadSource = data.source;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function handleQuery(e: Event) {
		e.preventDefault();
		if (!question.trim()) {
			error = 'Please enter a question.';
			return;
		}
		error = '';
		answer = '';
		loading = true;
		try {
			const res = await fetch('http://localhost:3000/api/query', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Query failed');
			answer = data.answer || JSON.stringify(data);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
	<div class="w-full max-w-xl space-y-8 rounded-xl bg-white p-8 shadow-lg">
		<h1 class="mb-4 text-center text-2xl font-bold text-gray-800">Local LLM Embeddings Demo</h1>

		<form onsubmit={handleUpload} class="space-y-4" autocomplete="off">
			<label class="block text-sm font-medium text-gray-700">
				Upload document:
				<input
					type="file"
					accept=".txt,.md,.docx"
					class="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
					onchange={(e: Event) => {
						const input = e.target as HTMLInputElement;
						file = input.files?.[0] ?? null;
					}}
				/>
			</label>
			<button
				type="submit"
				class="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
				disabled={loading}
			>
				{loading ? 'Uploading...' : 'Upload'}
			</button>
		</form>

		{#if uploadMessage}
			<div class="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
				<strong>{uploadMessage}</strong> <span class="text-gray-500">({uploadSource})</span>
			</div>
			{#if uploadChunks.length}
				<details class="mt-2">
					<summary class="cursor-pointer text-blue-600 hover:underline"
						>Show document chunks</summary
					>
					<ul class="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs text-gray-600">
						{#each uploadChunks as chunk}
							<li class="mb-1">{chunk}</li>
						{/each}
					</ul>
				</details>
			{/if}
		{/if}

		<form onsubmit={handleQuery} class="space-y-4 pt-4" autocomplete="off">
			<label class="block text-sm font-medium text-gray-700">
				Ask a question:
				<input
					type="text"
					bind:value={question}
					placeholder="Type your question..."
					class="mt-1 block w-full rounded-lg border-gray-300 text-gray-800 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
				/>
			</label>
			<button
				type="submit"
				class="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
				disabled={loading}
			>
				{loading ? 'Asking...' : 'Ask'}
			</button>
		</form>

		{#if answer}
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
				<strong>Answer:</strong>
				<div class="mt-2 whitespace-pre-line">{answer}</div>
			</div>
		{/if}

		{#if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
				{error}
			</div>
		{/if}
	</div>
</div>
