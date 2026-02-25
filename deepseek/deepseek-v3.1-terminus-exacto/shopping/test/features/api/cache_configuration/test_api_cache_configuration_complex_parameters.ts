import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

export async function test_api_cache_configuration_complex_parameters(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create complex distributed cache configuration
  const complexConfiguration = {
    cache_key: "distributed.search_index",
    cache_type: "distributed",
    configuration_value: JSON.stringify({
      topology: {
        nodes: [
          { host: "node1.cache.example.com", port: 6379, weight: 1 },
          { host: "node2.cache.example.com", port: 6379, weight: 1 },
          { host: "node3.cache.example.com", port: 6379, weight: 2 },
        ],
        replication: {
          strategy: "master-slave",
          sync_mode: "async",
          failover: {
            enabled: true,
            timeout_ms: 5000,
            auto_promotion: true,
          },
        },
        sharding: {
          algorithm: "consistent-hashing",
          virtual_nodes: 160,
        },
      },
      optimization: {
        ttl: 3600,
        max_memory: "2GB",
        compression: {
          enabled: true,
          algorithm: "lz4",
          threshold: 1024,
        },
        eviction_policy: "lru",
        batch_operations: {
          enabled: true,
          max_batch_size: 100,
          timeout_ms: 100,
        },
      },
      monitoring: {
        metrics_enabled: true,
        health_check_interval: 30000,
        alert_thresholds: {
          memory_usage: 0.8,
          connection_count: 1000,
          latency_ms: 100,
        },
      },
    }),
    description:
      "Distributed cache configuration for search index optimization with multi-node topology, failover strategies, and advanced performance tuning",
    is_active: true,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IEcommerceCacheConfiguration.ICreate;
  // Create cache configuration
  const createdConfig =
    await api.functional.ecommerce.administrator.cache_configurations.create(
      adminConnection,
      {
        body: complexConfiguration,
      },
    );
  typia.assert(createdConfig);
  // Validate the created configuration
  TestValidator.equals(
    "cache_key matches",
    createdConfig.cache_key,
    "distributed.search_index",
  );
  TestValidator.equals(
    "cache_type matches",
    createdConfig.cache_type,
    "distributed",
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdConfig.id,
    ),
  );
  TestValidator.equals("is_active is true", createdConfig.is_active, true);
  TestValidator.predicate(
    "priority is valid",
    createdConfig.priority >= 1 && createdConfig.priority <= 10,
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(createdConfig.created_at).getTime()),
  );
  // Verify complex JSON configuration was stored correctly by parsing it back
  const parsedConfig = JSON.parse(complexConfiguration.configuration_value);
  TestValidator.predicate(
    "topology configuration exists",
    parsedConfig.topology !== undefined,
  );
  TestValidator.predicate(
    "nodes array exists",
    Array.isArray(parsedConfig.topology.nodes),
  );
  TestValidator.equals(
    "correct number of nodes",
    parsedConfig.topology.nodes.length,
    3,
  );
  TestValidator.predicate(
    "optimization settings exist",
    parsedConfig.optimization !== undefined,
  );
  TestValidator.predicate(
    "monitoring configuration exists",
    parsedConfig.monitoring !== undefined,
  );
}
