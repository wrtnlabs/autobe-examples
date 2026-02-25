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

export async function test_api_cache_configuration_parameter_definition_update_complete_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Use a random UUID for the definition to update
  const definitionId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update data - note that the actual DTO type suggests this is for category operations
  const updateData: IEcommerceCacheConfigurationParameterDefinition.IUpdate = {
    description: RandomGenerator.paragraph({ sentences: 2 }),
    default_value: RandomGenerator.alphabets(8),
    validation_rules: JSON.stringify({
      required: true,
      min_length: 1,
      max_length: 100,
    }),
    min_value: "1",
    max_value: "100",
    allowed_values: JSON.stringify(["OPTION_A", "OPTION_B", "OPTION_C"]),
    pattern: "^[a-zA-Z0-9_]+$",
  };
  // Perform the update operation
  const result =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.update(
      adminConnection,
      {
        definitionId,
        body: updateData,
      },
    );
  // Validate the response structure
  typia.assert(result);
  // Basic validation of the returned category operation record
  TestValidator.equals("id should be present", typeof result.id, "string");
  TestValidator.predicate(
    "should have operation_type",
    () => typeof result.operation_type === "string",
  );
  TestValidator.predicate("should have administrator", () =>
    Boolean(result.administrator),
  );
  TestValidator.predicate("should have category", () =>
    Boolean(result.category),
  );
  TestValidator.predicate(
    "should have created_at timestamp",
    () => typeof result.created_at === "string",
  );
}
