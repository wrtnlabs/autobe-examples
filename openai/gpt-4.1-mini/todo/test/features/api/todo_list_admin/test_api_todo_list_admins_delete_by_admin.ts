import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * This test verifies the deletion of an administrator account by an
 * authenticated admin user.
 *
 * The test performs:
 *
 * 1. Admin registration via the join API to establish authentication context.
 * 2. Deletion of the created admin account by its UUID.
 * 3. Validates correct authorization and successful deletion without errors.
 *
 * It uses realistic randomly generated emails and confirms API response types.
 */
export async function test_api_todo_list_admins_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signs up to acquire authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Delete the admin account
  await api.functional.todoList.admin.todoListAdmins.erase(connection, {
    id: admin.id,
  });
}
