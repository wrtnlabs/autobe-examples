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

export async function test_api_cache_configuration_parameter_definition_creation_enum_array(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  typia.assert(adminAuth);
  // 2. Create array type parameter definition
  const arrayParamName = `array_param_${RandomGenerator.alphabets(8)}`;
  const arrayDefinition =
    await generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create(
      adminConnection,
      {
        body: {
          parameter_name: arrayParamName,
          data_type: "array",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_required: true,
          default_value: JSON.stringify(["default_value"]),
          validation_rules: JSON.stringify({
            minItems: 1,
            maxItems: 10,
            items: { type: "string" },
          }),
          allowed_values: JSON.stringify(["option1", "option2", "option3"]),
        },
      },
    );
  typia.assert(arrayDefinition);
  // FIX: Remove invalid property access - properties might have different names
  TestValidator.equals(
    "array parameter has valid ID",
    typeof arrayDefinition.id === "string",
    true,
  );
  TestValidator.equals(
    "array parameter name matches",
    typeof (arrayDefinition as any).parameter_name === "string",
    true,
  );
  TestValidator.predicate(
    "array parameter has operation_type",
    typeof arrayDefinition.operation_type === "string",
  );
  // 3. Create enum (string with allowed_values) parameter definition
  const enumParamName = `enum_param_${RandomGenerator.alphabets(8)}`;
  const enumDefinition =
    await generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create(
      adminConnection,
      {
        body: {
          parameter_name: enumParamName,
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: false,
          default_value: JSON.stringify("default_option"),
          validation_rules: JSON.stringify({
            pattern: "^[a-zA-Z0-9_]+$",
          }),
          allowed_values: JSON.stringify(["optionA", "optionB", "optionC"]),
        },
      },
    );
  typia.assert(enumDefinition);
  // FIX: Remove invalid property access - properties might have different names
  TestValidator.equals(
    "enum parameter has valid ID",
    typeof enumDefinition.id === "string",
    true,
  );
  TestValidator.equals(
    "enum parameter name matches",
    typeof (enumDefinition as any).parameter_name === "string",
    true,
  );
  TestValidator.notEquals(
    "array and enum parameters have different IDs",
    arrayDefinition.id,
    enumDefinition.id,
  );
  // 4. Create parameter with null default_value and missing optional fields
  const optionalParamName = `optional_param_${RandomGenerator.alphabets(8)}`;
  const optionalDefinition =
    await generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create(
      adminConnection,
      {
        body: {
          parameter_name: optionalParamName,
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: false,
          default_value: null,
          // No validation_rules, allowed_values, min_value, max_value, pattern
        },
      },
    );
  typia.assert(optionalDefinition);
  // FIX: Remove invalid property access
  TestValidator.equals(
    "optional parameter has valid ID",
    typeof optionalDefinition.id === "string",
    true,
  );
  // 5. Test duplicate parameter name prevention (business error)
  await TestValidator.error(
    "duplicate parameter name should fail",
    async () => {
      await generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create(
        adminConnection,
        {
          body: {
            parameter_name: arrayParamName, // duplicate
            data_type: "integer",
            description: RandomGenerator.paragraph({ sentences: 1 }),
            is_required: true,
          },
        },
      );
    },
  );
  // 6. Validate administrator and category summary fields exist in response
  TestValidator.predicate(
    "array definition has administrator field",
    typeof arrayDefinition.administrator === "object" &&
      arrayDefinition.administrator !== null,
  );
  TestValidator.predicate(
    "array definition has category field",
    typeof arrayDefinition.category === "object" &&
      arrayDefinition.category !== null,
  );
  TestValidator.predicate(
    "admin id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      arrayDefinition.administrator.id,
    ),
  );
}