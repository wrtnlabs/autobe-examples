import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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
import { generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_configuration_parameter_definition_creation_complex_numeric(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create numeric parameter definition with comprehensive validation rules
  const parameterDefinition =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.create(
      adminConnection,
      {
        body: {
          parameter_name: "max_cache_size",
          data_type: "integer",
          description: "Maximum cache size in megabytes with range validation",
          default_value: "500",
          validation_rules: JSON.stringify({
            type: "integer",
            minimum: 1,
            maximum: 1000,
            message: "Cache size must be between 1 and 1000 MB",
          }),
          is_required: true,
          min_value: "1",
          max_value: "1000",
          allowed_values: null,
          pattern: null,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(parameterDefinition);
  
  // CAST the response to the ICreate interface to access the properties
  const paramCreate = typia.assert<IEcommerceCacheConfigurationParameterDefinition.ICreate>(parameterDefinition);
  
  // Verify the created parameter definition
  TestValidator.equals(
    "parameter_name",
    paramCreate.parameter_name,
    "max_cache_size",
  );
  TestValidator.equals("data_type", paramCreate.data_type, "integer");
  TestValidator.equals("is_required", paramCreate.is_required, true);
  TestValidator.equals("min_value", paramCreate.min_value, "1");
  TestValidator.equals("max_value", paramCreate.max_value, "1000");
  TestValidator.equals(
    "default_value",
    paramCreate.default_value,
    "500",
  );
  // Validate that default value is within the specified range
  const defaultValue = parseInt(paramCreate.default_value!, 10);
  const minValue = parseInt(paramCreate.min_value!, 10);
  const maxValue = parseInt(paramCreate.max_value!, 10);
  TestValidator.predicate(
    "default_value >= min_value",
    defaultValue >= minValue,
  );
  TestValidator.predicate(
    "default_value <= max_value",
    defaultValue <= maxValue,
  );
  // Test boundary values
  TestValidator.predicate("min_value is minimum", minValue === 1);
  TestValidator.predicate("max_value is maximum", maxValue === 1000);
  // Validate validation_rules JSON contains correct constraints
  if (paramCreate.validation_rules) {
    const validationRules = JSON.parse(paramCreate.validation_rules);
    TestValidator.equals(
      "validation_rules.type",
      validationRules.type,
      "integer",
    );
    TestValidator.equals(
      "validation_rules.minimum",
      validationRules.minimum,
      1,
    );
    TestValidator.equals(
      "validation_rules.maximum",
      validationRules.maximum,
      1000,
    );
  }
}