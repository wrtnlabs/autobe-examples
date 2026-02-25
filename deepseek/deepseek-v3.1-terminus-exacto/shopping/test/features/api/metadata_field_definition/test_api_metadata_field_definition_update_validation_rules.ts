import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test validation rules update for metadata registry field definitions.
 * Verifies that administrators can update validation rules with valid JSON syntax
 * and handle nullable validation_rules field properly.
 */
export async function test_api_metadata_field_definition_update_validation_rules(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Simulate existing registry and field IDs
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const fieldId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Test successful update with valid JSON validation rules
  const validValidationRules = JSON.stringify({
    minLength: 5,
    maxLength: 100,
    pattern: "^[a-zA-Z0-9_]+$",
    required: true,
  });
  const body: IEcommerceMetadataRegistryFieldDefinition.IUpdate = {
    validation_rules: validValidationRules,
  } satisfies IEcommerceMetadataRegistryFieldDefinition.IUpdate;
  const updated =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.update(
      adminConnection,
      {
        registryId,
        fieldId,
        body,
      },
    );
  typia.assert(updated);
  // Validate that validation_rules were updated
  TestValidator.equals(
    "validation_rules should match updated value",
    updated.validation_rules,
    validValidationRules,
  );
  // Step 3: Test updating with null validation_rules
  const nullBody: IEcommerceMetadataRegistryFieldDefinition.IUpdate = {
    validation_rules: null,
  } satisfies IEcommerceMetadataRegistryFieldDefinition.IUpdate;
  const nullUpdated =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.update(
      adminConnection,
      {
        registryId,
        fieldId,
        body: nullBody,
      },
    );
  typia.assert(nullUpdated);
  TestValidator.equals(
    "validation_rules should be nullable",
    nullUpdated.validation_rules,
    null,
  );
  // Step 4: Test that other properties can be updated alongside validation_rules
  const comprehensiveBody: IEcommerceMetadataRegistryFieldDefinition.IUpdate = {
    field_name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    validation_rules: JSON.stringify({ min: 0, max: 100 }),
  } satisfies IEcommerceMetadataRegistryFieldDefinition.IUpdate;
  const comprehensiveUpdated =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.update(
      adminConnection,
      {
        registryId,
        fieldId,
        body: comprehensiveBody,
      },
    );
  typia.assert(comprehensiveUpdated);
  // Validate that validation_rules were updated with other fields
  TestValidator.equals(
    "validation_rules should work with other field updates",
    comprehensiveUpdated.validation_rules,
    JSON.stringify({ min: 0, max: 100 }),
  );
}