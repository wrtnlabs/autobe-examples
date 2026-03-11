import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_multi_user_todo_admin_system_configurations_create } from "../../../generate/generate_random_multi_user_todo_admin_system_configurations_create";
import { prepare_random_multi_user_todo_system_configuration } from "../../../prepare/prepare_random_multi_user_todo_system_configuration";

/**
 * Test the successful creation of a basic system configuration by an authenticated admin.
 * The admin first registers via auth/admin/join to obtain authentication tokens.
 * Then creates a system configuration with valid required fields: config_key, config_value,
 * data_type, scope, and description. Use data_type 'string' and scope 'global' for this
 * basic test. Validate that the response includes all created fields with proper defaults:
 * is_active=true, version=1, generated id, and proper timestamps (created_at, updated_at,
 * deleted_at=null). Ensure the configuration is immediately available for system use
 * and follows all business rules about data type validation and scope applicability.
 */
export async function test_api_admin_system_configuration_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Create system configuration using utility function
  const config =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `test.config.${RandomGenerator.alphabets(8)}`,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as "string",
          scope: "global" as "global",
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_active: true,
        },
      },
    );
  typia.assert(config);
  // 3. Validate response has all required fields
  TestValidator.equals(
    "config_key matches input",
    config.config_key.includes("test.config."),
    true,
  );
  TestValidator.predicate(
    "config_value is string",
    typeof config.config_value === "string",
  );
  TestValidator.equals("data_type is string", config.data_type, "string");
  TestValidator.equals("scope is global", config.scope, "global");
  TestValidator.predicate(
    "description is string",
    typeof config.description === "string",
  );
  // 4. Validate default values
  TestValidator.equals("is_active defaults to true", config.is_active, true);
  TestValidator.equals("version starts at 1", config.version, 1);
  TestValidator.predicate(
    "deleted_at is null for new config",
    config.deleted_at === null,
  );
  // 5. Validate generated fields
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(config.id),
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(config.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(config.updated_at);
    return !isNaN(date.getTime());
  });
}
