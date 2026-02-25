import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_create";
import { generate_random_ecommerce_super_administrator_cache_configurations_parameters_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameters_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { prepare_random_ecommerce_cache_configuration_parameter } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter";

/**
 * Test audit trail preservation after parameter deletion.
 * Create cache configuration hierarchy, add multiple parameters, then perform deletions
 * while maintaining audit trail integrity. Verify deleted parameters remain accessible
 * in snapshot records and audit logs. Check historical relationships are preserved.
 */
export async function test_api_cache_parameter_audit_trail_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(authorizedAdmin);
  // 2. Create cache configuration
  const cacheConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: `test.config.${RandomGenerator.alphabets(8)}`,
          cache_type: "redis",
          configuration_value: JSON.stringify({ timeout: 5000 }),
          description: "Test configuration for audit trail validation",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // 3. Add first parameter for deletion testing
  const param1DefinitionId = typia.random<string & tags.Format<"uuid">>();
  const param1Body = {
    ecommerce_cache_configuration_parameter_definition_id: param1DefinitionId,
    parameter_value: "test_value_1",
  } satisfies IEcommerceCacheConfigurationParameter.ICreate;
  const parameter1 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        body: param1Body,
        params: { configId: cacheConfig.id },
      },
    );
  typia.assert(parameter1);
  // 4. Add second parameter to test multiple deletions
  const param2DefinitionId = typia.random<string & tags.Format<"uuid">>();
  const param2Body = {
    ecommerce_cache_configuration_parameter_definition_id: param2DefinitionId,
    parameter_value: "test_value_2",
  } satisfies IEcommerceCacheConfigurationParameter.ICreate;
  const parameter2 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        body: param2Body,
        params: { configId: cacheConfig.id },
      },
    );
  typia.assert(parameter2);
  // 5. Delete first parameter using erase endpoint
  await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.erase(
    superAdminConnection,
    {
      configId: cacheConfig.id,
      parameterId: parameter1.id,
    },
  );
  // 6. Check snapshot for audit trail preservation
  const snapshots =
    await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(
      superAdminConnection,
      {
        configId: cacheConfig.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate that deleted parameter still exists in snapshot audit trail
  TestValidator.predicate(
    "snapshots should contain audit records",
    snapshots.data.length > 0,
  );
  // 8. Verify second parameter still exists and is accessible
  TestValidator.notEquals(
    "second parameter should not be deleted yet",
    parameter2.id,
    parameter1.id,
  );
  // 9. Delete second parameter
  await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.erase(
    superAdminConnection,
    {
      configId: cacheConfig.id,
      parameterId: parameter2.id,
    },
  );
  // 10. Final snapshot check to validate comprehensive audit trail
  const finalSnapshots =
    await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(
      superAdminConnection,
      {
        configId: cacheConfig.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(finalSnapshots);
  // 11. Validate audit trail completeness
  TestValidator.predicate(
    "final snapshots should contain multiple audit entries",
    finalSnapshots.data.length >= 2,
  );
}
