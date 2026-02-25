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

export async function test_api_cache_configuration_parameter_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    { body: undefined },
  );
  typia.assert(authResult);
  // 2. Create cache configuration
  const configBody = {
    cache_key: RandomGenerator.alphabets(10),
    cache_type: "redis",
    configuration_value: JSON.stringify({ host: "localhost", port: 6379 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >() satisfies number as number,
  } satisfies IEcommerceCacheConfiguration.ICreate;
  const config =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      { body: configBody },
    );
  typia.assert(config);
  // 3. Create parameter definition
  const paramDefBody = {
    parameter_name: "max_memory_mb",
    data_type: "integer",
    description: "Maximum memory allocation in megabytes",
    default_value: "1024",
    validation_rules: JSON.stringify({ min: 128, max: 16384 }),
    is_required: true,
    min_value: "128",
    max_value: "16384",
    allowed_values: null,
    pattern: null,
  } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate;
  const paramDef =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      { body: paramDefBody },
    );
  typia.assert(paramDef);
  // 4. Create parameter value
  const paramValueBody = {
    ecommerce_cache_configuration_parameter_definition_id: paramDef.id,
    parameter_value: "2048",
  } satisfies IEcommerceCacheConfigurationParameter.ICreate;
  const createdParam =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        body: paramValueBody,
        params: { configId: config.id },
      },
    );
  typia.assert(createdParam);
  // 5. Retrieve the parameter value
  const retrieved =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.at(
      superAdminConnection,
      {
        configId: config.id,
        parameterId: createdParam.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate all expected fields are present
  TestValidator.equals("id matches", retrieved.id, createdParam.id);
  TestValidator.equals(
    "parameter name matches definition",
    retrieved.parameter_name,
    paramDefBody.parameter_name,
  );
  TestValidator.equals(
    "parameter value matches",
    retrieved.parameter_value,
    paramValueBody.parameter_value,
  );
  TestValidator.equals(
    "data type matches definition",
    retrieved.data_type,
    paramDefBody.data_type,
  );
  TestValidator.equals(
    "description matches definition",
    retrieved.description,
    paramDefBody.description,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => new Date(retrieved.created_at).toString() !== "Invalid Date",
  );
  // 7. Business logic validation - parameter belongs to correct configuration
  // Note: The retrieved parameter doesn't have explicit configId field,
  // but the GET endpoint path ensures it belongs to the specified config
  // We've validated this by using the correct configId in the GET request
  // 8. Verify metadata completeness
  TestValidator.predicate(
    "has parameter name",
    () => retrieved.parameter_name.length > 0,
  );
  TestValidator.predicate(
    "has data type",
    () => retrieved.data_type.length > 0,
  );
  TestValidator.predicate(
    "has description",
    () => retrieved.description.length > 0,
  );
}