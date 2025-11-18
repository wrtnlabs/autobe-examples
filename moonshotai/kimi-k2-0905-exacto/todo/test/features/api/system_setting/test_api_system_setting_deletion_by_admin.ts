import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate admin deletion of system settings by business key.
 *
 * - Registers a new admin and authenticates via /auth/admin/join.
 * - Attempts to delete a system setting by its unique key (simulate with two
 *   keys).
 * - First, try deleting a setting that 'exists' in the context (simulate
 *   existence as we cannot create settings here).
 * - Second, try deleting a key that does not exist and expect an error.
 * - Ensure deletion is irreversible; deleting again must yield error.
 * - No user-level settings are touched; audit and logging are assumed out of
 *   scope.
 */
export async function test_api_system_setting_deletion_by_admin(
  connection: api.IConnection,
) {
  // Register new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.todo.example.com/register",
    referrer: "https://app.todo.example.com/settings",
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // Positive case: Attempt to delete a system setting (simulate key existence)
  const settingKey = "max_login_attempts";
  await api.functional.todoList.admin.systemSettings.erase(connection, {
    key: settingKey,
  });
  // No response for void APIs
  // Deletion is irreversible: deleting again must throw error
  await TestValidator.error(
    "deleting already-deleted system setting should fail",
    async () => {
      await api.functional.todoList.admin.systemSettings.erase(connection, {
        key: settingKey,
      });
    },
  );

  // Negative case: Try deleting a system setting that doesn't exist
  const unknownKey = RandomGenerator.alphaNumeric(12); // unlikely to exist
  await TestValidator.error(
    "deleting non-existent system setting fails with error",
    async () => {
      await api.functional.todoList.admin.systemSettings.erase(connection, {
        key: unknownKey,
      });
    },
  );
}
