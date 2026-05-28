import { normalizeProviderId } from "../agents/provider-id.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  resolvePluginCapabilityProvider,
  resolvePluginCapabilityProviders,
} from "./capability-provider-runtime.js";
import {
  getRegisteredMemoryEmbeddingProvider,
  listRegisteredMemoryEmbeddingProviders,
  type MemoryEmbeddingProviderAdapter,
} from "./memory-embedding-providers.js";
import { resolveConfiguredProviderConfig } from "./provider-config-owner.js";

export { listRegisteredMemoryEmbeddingProviders };

export function listRegisteredMemoryEmbeddingProviderAdapters(): MemoryEmbeddingProviderAdapter[] {
  return listRegisteredMemoryEmbeddingProviders().map((entry) => entry.adapter);
}
export function listMemoryEmbeddingProviders(
  cfg?: OpenClawConfig,
): MemoryEmbeddingProviderAdapter[] {
  const registered = listRegisteredMemoryEmbeddingProviderAdapters();
  const merged = new Map(registered.map((adapter) => [adapter.id, adapter]));
  for (const adapter of resolvePluginCapabilityProviders({
    key: "memoryEmbeddingProviders",
    cfg,
  })) {
    if (!merged.has(adapter.id)) {
      merged.set(adapter.id, adapter);
    }
  }
  return [...merged.values()];
}

function readConfiguredProviderApiId(providerId: string, cfg?: OpenClawConfig): string | undefined {
  const normalized = normalizeProviderId(providerId);
  const providerConfig = resolveConfiguredProviderConfig({ provider: providerId, config: cfg });
  const api = providerConfig?.api?.trim();
  if (!api) {
    return undefined;
  }
  const normalizedApi = normalizeProviderId(api);
  return normalizedApi && normalizedApi !== normalized ? normalizedApi : undefined;
}

function resolveMemoryEmbeddingProviderLookupIds(id: string, cfg?: OpenClawConfig): string[] {
  const ids = [id];
  const apiId = readConfiguredProviderApiId(id, cfg);
  if (apiId && !ids.some((candidate) => normalizeProviderId(candidate) === apiId)) {
    ids.push(apiId);
  }
  return ids;
}

export function getMemoryEmbeddingProvider(
  id: string,
  cfg?: OpenClawConfig,
): MemoryEmbeddingProviderAdapter | undefined {
  const ids = resolveMemoryEmbeddingProviderLookupIds(id, cfg);
  for (const candidateId of ids) {
    const registered = getRegisteredMemoryEmbeddingProvider(candidateId);
    if (registered) {
      return registered.adapter;
    }
  }
  for (const candidateId of ids) {
    const provider = resolvePluginCapabilityProvider({
      key: "memoryEmbeddingProviders",
      providerId: candidateId,
      cfg,
    });
    if (provider) {
      return provider;
    }
  }
  return undefined;
}
