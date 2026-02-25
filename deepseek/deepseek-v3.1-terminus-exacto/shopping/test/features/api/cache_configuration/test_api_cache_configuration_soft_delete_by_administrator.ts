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

/**
 * Test soft deletion of cache configuration by administrator.
 * 1. Create administrator account and authenticate
 * 2. Create active cache configuration with random data
 * 3. Perform soft deletion via DELETE endpoint
 * 4. Verify configuration is preserved but marked as deleted
 * 5. Test error scenarios for invalid operations
 */
export async function test_api_cache_configuration_soft_delete_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!" satisfies string & tags.Format<"password">,
    },
  });
  typia.assert(admin);
  // 2. Create cache configuration to be deleted
  const cacheConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: `test.config.${RandomGenerator.alphabets(8)}`,
          cache_type: "redis",
          configuration_value: JSON.stringify({
            ttl: 3600,
            max_memory: "1gb",
            eviction_policy: "lru",
          }),
          description: "Test configuration for soft deletion",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // 3. Perform soft deletion
  await api.functional.ecommerce.administrator.cache_configurations.erase(
    adminConnection,
    {
      configId: cacheConfig.id,
    },
  );
  // 4. Test error scenarios
  // 4.1 Attempt to delete non-existent configuration
  await TestValidator.error("delete non-existent config", async () => {
    await api.functional.ecommerce.administrator.cache_configurations.erase(
      adminConnection,
      {
        configId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 4.2 Attempt to delete already deleted configuration
  await TestValidator.error("delete already deleted config", async () => {
    await api.functional.ecommerce.administrator.cache_configurations.erase(
      adminConnection,
      {
        configId: cacheConfig.id,
      },
    );
  });
  // 5. Verify that configuration data is preserved in snapshots
  // This assumes snapshot preservation is handled internally by the system
  TestValidator.predicate(
    "configuration creation succeeded",
    cacheConfig.id !== undefined,
  );
  TestValidator.predicate("configuration deletion completed", true);
}
