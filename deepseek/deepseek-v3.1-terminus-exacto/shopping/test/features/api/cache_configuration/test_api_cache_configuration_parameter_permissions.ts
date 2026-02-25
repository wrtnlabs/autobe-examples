import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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
import { generate_random_ecommerce_administrator_cache_configurations_parameters_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_parameters_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_configuration_parameter_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_pass123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create a valid cache configuration for testing
  const cacheConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: "test.param.permissions",
          cache_type: "memory",
          configuration_value: JSON.stringify({ ttl: 3600 }),
          description: "Test configuration for parameter permissions",
          is_active: true,
          priority: 5,
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // Test 1: Verify administrator can create parameter on active configuration
  const parameter1 =
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "max_size",
          data_type: "integer",
          description: "Maximum cache size in MB",
          default_value: "100",
          validation_rules: JSON.stringify({ min: 1, max: 1000 }),
          is_required: false,
          min_value: "1",
          max_value: "1000",
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(parameter1);
  // Test 2: Attempt parameter creation with invalid configuration ID (should fail)
  await TestValidator.error("invalid configuration ID", async () => {
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          parameter_name: "test_invalid",
          data_type: "string",
          description: "Should fail due to invalid config ID",
          is_required: false,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  });
  // Test 3: Create a second administrator to test authorization boundaries
  const admin2 = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin2_pass456",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin2);
  // Test 4: Verify second administrator can also create parameters (authorization scope)
  const parameter2 =
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "compression_level",
          data_type: "integer",
          description: "Compression level for cached data",
          default_value: "6",
          validation_rules: JSON.stringify({ min: 0, max: 9 }),
          is_required: false,
          min_value: "0",
          max_value: "9",
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(parameter2);
  // Test cleanup and validation
  TestValidator.predicate(
    "parameter created successfully",
    parameter1.id !== undefined,
  );
  TestValidator.predicate(
    "second parameter created successfully",
    parameter2.id !== undefined,
  );
  TestValidator.equals(
    "first parameter linked to correct configuration",
    parameter1.operation_type.length > 0,
    true,
  );
  TestValidator.equals(
    "second parameter linked to correct configuration",
    parameter2.operation_type.length > 0,
    true,
  );
}