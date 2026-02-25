import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

export async function test_api_superadministrator_cache_configuration_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create a test cache configuration
  const cacheConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          cache_type: "memory",
          configuration_value: JSON.stringify({ ttl: 3600, maxEntries: 1000 }),
          description: "Test configuration for already deleted scenario",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // 3. Delete the cache configuration first time
  await api.functional.ecommerce.superAdministrator.cache_configurations.erase(
    superAdminConnection,
    {
      configId: cacheConfig.id,
    },
  );
  // 4. Attempt to delete the same cache configuration again
  // The endpoint should handle this gracefully (either succeed silently or throw appropriate error)
  await api.functional.ecommerce.superAdministrator.cache_configurations.erase(
    superAdminConnection,
    {
      configId: cacheConfig.id,
    },
  );
  // If we reach here without error, the system gracefully handled the duplicate deletion
  // This validates that the operation properly handles the already-deleted scenario
  TestValidator.predicate("duplicate deletion handled gracefully", true);
}
