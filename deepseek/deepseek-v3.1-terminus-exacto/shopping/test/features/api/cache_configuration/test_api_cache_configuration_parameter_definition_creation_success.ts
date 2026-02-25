import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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
import { generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_configuration_parameter_definition_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as super administrator to get authorization
  const authorized = await authorize_super_administrator_join(
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
  typia.assert(authorized);
  // Create parameter definition with valid data
  const parameterDefinition =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.create(
      superAdminConnection,
      {
        body: {
          parameter_name: RandomGenerator.alphabets(10),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_required: true,
          default_value: "default_value",
          validation_rules: JSON.stringify({ min_length: 1, max_length: 100 }),
          min_value: null,
          max_value: null,
          allowed_values: JSON.stringify(["value1", "value2", "value3"]),
          pattern: "^[a-zA-Z0-9_]+$",
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(parameterDefinition);
  // Validate response structure matches IEcommerceCacheConfigurationParameterDefinition
  TestValidator.predicate(
    "has valid UUID ID",
    parameterDefinition.id.length > 0,
  );
  TestValidator.predicate(
    "has operation type",
    parameterDefinition.operation_type.length > 0,
  );
  TestValidator.predicate(
    "has created timestamp",
    parameterDefinition.created_at.length > 0,
  );
  TestValidator.predicate(
    "has administrator data",
    parameterDefinition.administrator.id.length > 0,
  );
  TestValidator.predicate(
    "has category data",
    parameterDefinition.category.id.length > 0,
  );
}
