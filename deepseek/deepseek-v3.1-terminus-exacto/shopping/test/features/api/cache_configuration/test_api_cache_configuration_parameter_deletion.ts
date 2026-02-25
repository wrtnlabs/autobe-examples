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

export async function test_api_cache_configuration_parameter_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // Step 2: Create a cache configuration
  const cacheConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
          cache_type: "redis",
          configuration_value: JSON.stringify({
            host: "localhost",
            port: 6379,
          }),
          description: "Test cache configuration",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        },
      },
    );
  typia.assert(cacheConfig);
  // Step 3: Add a parameter to the cache configuration
  const parameter =
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          parameter_name: `test_param_${RandomGenerator.alphaNumeric(8)}`,
          data_type: "string",
          description: "Test parameter definition",
          default_value: "default_value",
          validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
          is_required: true,
          min_value: "1",
          max_value: "100",
          allowed_values: JSON.stringify(["value1", "value2", "value3"]),
          pattern: "^[a-zA-Z0-9_]+$",
        },
      },
    );
  typia.assert(parameter);
  // Step 4: Delete the parameter
  await api.functional.ecommerce.administrator.cache_configurations.parameters.erase(
    adminConnection,
    {
      configId: cacheConfig.id,
      parameterId: parameter.id,
    },
  );
  // Step 5: Attempt to delete the same parameter again and expect an error
  await TestValidator.error(
    "deletion of already deleted parameter",
    async () => {
      await api.functional.ecommerce.administrator.cache_configurations.parameters.erase(
        adminConnection,
        {
          configId: cacheConfig.id,
          parameterId: parameter.id,
        },
      );
    },
  );
}
