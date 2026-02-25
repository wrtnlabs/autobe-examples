import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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
import { generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create";
import { generate_random_ecommerce_super_administrator_cache_configurations_parameters_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameters_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { prepare_random_ecommerce_cache_configuration_parameter } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_configuration_parameter_soft_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
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
  // Create cache configuration
  const cacheConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: `test_config_${RandomGenerator.alphabets(8)}`,
          cache_type: "redis",
          configuration_value: JSON.stringify({
            host: "localhost",
            port: 6379,
          }),
          description: "Test cache configuration for soft deletion test",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // Create parameter definition
  const paramDef =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      {
        body: {
          parameter_name: `test_param_${RandomGenerator.alphabets(8)}`,
          data_type: "string",
          description: "Test parameter definition for soft deletion test",
          default_value: "default_value",
          validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
          is_required: false,
          min_value: null,
          max_value: null,
          allowed_values: null,
          pattern: null,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(paramDef);
  // Create parameter value
  const paramValue =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          ecommerce_cache_configuration_parameter_definition_id: paramDef.id,
          parameter_value: "test_value_123",
        } satisfies IEcommerceCacheConfigurationParameter.ICreate,
      },
    );
  typia.assert(paramValue);
  // Verify parameter can be retrieved initially
  const initialParam =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.at(
      superAdminConnection,
      {
        configId: cacheConfig.id,
        parameterId: paramValue.id,
      },
    );
  typia.assert(initialParam);
  TestValidator.equals(
    "parameter exists before deletion",
    initialParam.id,
    paramValue.id,
  );
  // Soft-delete the parameter value
  await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.erase(
    superAdminConnection,
    {
      configId: cacheConfig.id,
      parameterId: paramValue.id,
    },
  );
  // Attempt to retrieve the soft-deleted parameter - should throw 404
  await TestValidator.error(
    "soft-deleted parameter should throw 404",
    async () => {
      await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.at(
        superAdminConnection,
        {
          configId: cacheConfig.id,
          parameterId: paramValue.id,
        },
      );
    },
  );
}
