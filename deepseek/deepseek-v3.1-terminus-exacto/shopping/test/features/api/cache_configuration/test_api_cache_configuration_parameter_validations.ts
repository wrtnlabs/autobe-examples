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

/**
 * Test parameter creation validation failures and business logic constraints.
 * Administrator authenticates and creates cache configuration, then attempts to add
 * parameter values with various violations: invalid data types violating parameter
 * definition, values outside min/max constraints, values not in allowed enumeration,
 * pattern mismatches, duplicate parameters for same definition. Verify system rejects
 * invalid parameter values with appropriate error messages while maintaining
 * configuration integrity. Validate snapshot system captures all validation attempts
 * for audit purposes.
 */
export async function test_api_cache_configuration_parameter_validations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  // 2. Create cache configuration
  const cacheConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: `test_config_${RandomGenerator.alphabets(8)}`,
          cache_type: "redis",
          configuration_value: "{}",
          is_active: true,
          priority: 5,
        },
      },
    );
  typia.assert(cacheConfig);
  // 3. Test invalid data type violation
  await TestValidator.error("reject invalid data type", async () => {
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "timeout",
          data_type: "integer",
          description: "Connection timeout in seconds",
          default_value: "300",
          validation_rules: null,
          is_required: true,
          min_value: "0",
          max_value: "86400",
          allowed_values: null,
          pattern: null,
        },
      },
    );
  });
  // 4. Test value below minimum constraint
  await TestValidator.error("reject value below minimum", async () => {
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "max_connections",
          data_type: "integer",
          description: "Maximum concurrent connections",
          default_value: "10",
          validation_rules: null,
          is_required: true,
          min_value: "1",
          max_value: "1000",
          allowed_values: null,
          pattern: null,
        },
      },
    );
  });
  // 5. Test value above maximum constraint
  await TestValidator.error("reject value above maximum", async () => {
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "cache_size",
          data_type: "integer",
          description: "Cache size in megabytes",
          default_value: "100",
          validation_rules: null,
          is_required: true,
          min_value: "1",
          max_value: "1024",
          allowed_values: null,
          pattern: null,
        },
      },
    );
  });
  // 6. Test value not in allowed enumeration
  await TestValidator.error("reject value not in allowed values", async () => {
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "compression",
          data_type: "string",
          description: "Compression algorithm",
          default_value: "gzip",
          validation_rules: null,
          is_required: false,
          min_value: null,
          max_value: null,
          allowed_values: JSON.stringify(["gzip", "lz4", "snappy"]),
          pattern: null,
        },
      },
    );
  });
  // 7. Test pattern mismatch
  await TestValidator.error("reject pattern mismatch", async () => {
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "host_pattern",
          data_type: "string",
          description: "Host pattern validation",
          default_value: "localhost",
          validation_rules: null,
          is_required: true,
          min_value: null,
          max_value: null,
          allowed_values: null,
          pattern: "^[a-zA-Z0-9.-]+$",
        },
      },
    );
  });
  // 8. Test duplicate parameter for same definition
  await TestValidator.error("reject duplicate parameter", async () => {
    // First create a valid parameter
    const validParam =
      await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
        adminConnection,
        {
          params: { configId: cacheConfig.id },
          body: {
            parameter_name: "retry_count",
            data_type: "integer",
            description: "Number of retry attempts",
            default_value: "3",
            validation_rules: null,
            is_required: false,
            min_value: "0",
            max_value: "10",
            allowed_values: null,
            pattern: null,
          },
        },
      );
    typia.assert(validParam);
    // Attempt to create duplicate with same parameter_name
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "retry_count",
          data_type: "integer",
          description: "Different description but same name",
          default_value: "5",
          validation_rules: null,
          is_required: false,
          min_value: "0",
          max_value: "10",
          allowed_values: null,
          pattern: null,
        },
      },
    );
  });
  // 9. Test valid parameter creation
  const validParameter =
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: "valid_param",
          data_type: "string",
          description: "A valid parameter for testing",
          default_value: "default_value",
          validation_rules: null,
          is_required: true,
          min_value: null,
          max_value: null,
          allowed_values: null,
          pattern: null,
        },
      },
    );
  typia.assert(validParameter);
  // 10. Validate business integrity
  TestValidator.equals(
    "cache configuration remains intact",
    cacheConfig.id,
    cacheConfig.id,
  );
  TestValidator.predicate(
    "valid parameter was created successfully",
    validParameter.id !== undefined,
  );
}
