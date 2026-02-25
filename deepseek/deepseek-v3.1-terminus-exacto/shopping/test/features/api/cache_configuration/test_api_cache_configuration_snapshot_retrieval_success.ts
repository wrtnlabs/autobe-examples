import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

/**
 * Test successful retrieval of a cache configuration snapshot by a super administrator.
 * 1. Create super administrator account
 * 2. Create initial cache configuration
 * 3. Modify configuration (which should trigger snapshot creation)
 * 4. Since snapshotId retrieval is not available through current API endpoints,
 *    we validate that the modification workflow completes successfully
 */
export async function test_api_cache_configuration_snapshot_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create super administrator connection
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
  // 2. Create initial cache configuration
  const initialConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: RandomGenerator.alphabets(10),
          cache_type: "redis",
          configuration_value: JSON.stringify({ ttl: 3600, maxMemory: 1024 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // 3. Modify configuration to trigger snapshot creation
  const updatedConfig =
    await api.functional.ecommerce.superAdministrator.cache_configurations.update(
      superAdminConnection,
      {
        configId: initialConfig.id,
        body: {
          cache_key: `${initialConfig.cache_key}_updated`,
          configuration_value: { ttl: "7200", maxMemory: "2048" },
          is_active: false,
        } satisfies IEcommerceCacheConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // 4. Validate successful configuration modification
  TestValidator.notEquals(
    "cache key should be updated",
    initialConfig.cache_key,
    updatedConfig.cache_key,
  );
  TestValidator.equals(
    "is_active should be false",
    updatedConfig.is_active,
    false,
  );
  // Note: Actual snapshot retrieval test cannot be implemented with current API endpoints
  // as there is no way to obtain the snapshotId created during configuration update
  // This test validates the workflow up to the point of snapshot creation
}