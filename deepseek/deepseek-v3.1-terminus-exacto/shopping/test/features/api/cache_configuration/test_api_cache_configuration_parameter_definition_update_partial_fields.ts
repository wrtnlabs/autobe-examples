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

export async function test_api_cache_configuration_parameter_definition_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Create initial parameter definition
  const initialDefinition =
    await generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create(
      adminConnection,
      {
        body: {
          parameter_name: typia.random<string & tags.Format<"uuid">>(),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          default_value: "initial_default",
          validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
          is_required: true,
        },
      },
    );
  typia.assert(initialDefinition);
  // Perform partial update - only update description and default_value
  const partialUpdateBody = {
    description: RandomGenerator.paragraph({ sentences: 1 }),
    default_value: "updated_default",
    validation_rules: null,
  };
  const updatedDefinition =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.update(
      adminConnection,
      {
        definitionId: initialDefinition.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedDefinition);
  // Validate that the definition was properly updated with correct entity structure
  TestValidator.equals(
    "ID should remain the same",
    updatedDefinition.id,
    initialDefinition.id,
  );
  TestValidator.equals(
    "operation_type should remain",
    updatedDefinition.operation_type,
    initialDefinition.operation_type,
  );
  TestValidator.equals(
    "administrator should remain",
    updatedDefinition.administrator.id,
    initialDefinition.administrator.id,
  );
  TestValidator.equals(
    "category should remain",
    updatedDefinition.category.id,
    initialDefinition.category.id,
  );
}
