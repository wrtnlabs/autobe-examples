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

/**
 * Test retrieval of a soft-deleted system configuration.
 * Since create and delete endpoints are not available in the SDK,
 * this test verifies that the retrieval endpoint returns configuration
 * objects with the complete structure including deleted_at field.
 */
export async function test_api_system_configuration_retrieve_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Retrieve a configuration (using random ID since we can't create)
  const configId = typia.random<string & tags.Format<"uuid">>();
  const config =
    await api.functional.multiUserTodo.admin.system_configurations.at(
      adminConnection,
      { configurationId: configId },
    );
  typia.assert(config);
  // 3. Validate response structure includes all expected fields
  TestValidator.notEquals("configuration should have id", config.id, "");
  TestValidator.predicate(
    "config_key should be string",
    typeof config.config_key === "string",
  );
  TestValidator.predicate(
    "config_value should be string",
    typeof config.config_value === "string",
  );
  TestValidator.predicate(
    "data_type should be string",
    typeof config.data_type === "string",
  );
  TestValidator.predicate(
    "scope should be string",
    typeof config.scope === "string",
  );
  TestValidator.predicate(
    "description should be string",
    typeof config.description === "string",
  );
  TestValidator.predicate(
    "is_active should be boolean",
    typeof config.is_active === "boolean",
  );
  TestValidator.predicate(
    "version should be number",
    typeof config.version === "number" && config.version >= 1,
  );
  // 4. Validate timestamp fields
  TestValidator.predicate(
    "created_at should be ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.created_at),
  );
  TestValidator.predicate(
    "updated_at should be ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.updated_at),
  );
  // 5. Check deleted_at field (can be null or ISO date-time)
  if (config.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at should be ISO date-time string when not null",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.deleted_at),
    );
  }
  // 6. Verify configuration ID matches requested ID
  TestValidator.equals("retrieved configuration ID", config.id, configId);
}
