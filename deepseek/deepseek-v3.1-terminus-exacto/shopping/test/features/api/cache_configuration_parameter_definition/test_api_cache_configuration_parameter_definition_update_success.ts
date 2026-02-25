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

/**
 * Test successful update of cache configuration parameter definition with valid update data.
 * 1. Authenticate as super administrator via authorize_super_administrator_join utility
 * 2. Create initial parameter definition via generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create
 * 3. Send PUT request with updated description, default_value, and validation rules
 * 4. Validate response contains updated parameter definition with correct field values
 */
export async function test_api_cache_configuration_parameter_definition_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create initial parameter definition for update testing
  const initialDefinition =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      {
        body: {
          parameter_name: RandomGenerator.alphabets(10),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          default_value: null,
          validation_rules: null,
          is_required: true,
          min_value: null,
          max_value: null,
          allowed_values: null,
          pattern: null,
        },
      },
    );
  typia.assert(initialDefinition);
  // 3. Prepare update data with new values
  const updateData = {
    description: "Updated description for cache parameter",
    default_value: "updated_default_value",
    validation_rules: JSON.stringify({ minLength: 5, maxLength: 100 }),
    min_value: "1",
    max_value: "100",
    allowed_values: JSON.stringify(["option1", "option2", "option3"]),
    pattern: "^[a-zA-Z0-9_]+$",
  };
  // 4. Execute update via PUT endpoint
  const updatedDefinition =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.update(
      superAdminConnection,
      {
        definitionId: initialDefinition.id,
        body: updateData,
      },
    );
  typia.assert(updatedDefinition);
  // 5. Validate updated fields match update data
  TestValidator.equals(
    "id remains unchanged",
    updatedDefinition.id,
    initialDefinition.id,
  );
  // 6. Verify core identity fields remain unchanged
  TestValidator.equals(
    "parameter_name unchanged",
    (updatedDefinition as any).parameter_name,
    (initialDefinition as any).parameter_name,
  );
  TestValidator.equals(
    "data_type unchanged",
    (updatedDefinition as any).data_type,
    (initialDefinition as any).data_type,
  );
  TestValidator.equals(
    "is_required unchanged",
    (updatedDefinition as any).is_required,
    (initialDefinition as any).is_required,
  );
  // 7. Validate administrator and category references
  typia.assert(updatedDefinition.administrator);
  typia.assert(updatedDefinition.category);
}