import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate that an administrator can soft-delete a user by ID, following all
 * business policy requirements for user erasure.
 *
 * - Registers a new admin account for privileged access
 * - (Setup) Registers a second admin account to act as a "target user" (since we
 *   have no user join API in SDK, use admin account for realism)
 * - Authenticates as first admin
 * - Deletes target admin via /todoList/admin/users/{userId}
 * - Verifies soft deletion by attempting to delete or login again (should error)
 * - Tests error handling on random non-existent user ID
 * - (If we could distinguish roles, could check permission denial for non-admin,
 *   but only admin join is available)
 */
export async function test_api_admin_user_deletion_by_admin(
  connection: api.IConnection,
) {
  // Register and authenticate admin who performs deletion
  const adminJoin1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const deleter: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin1 });
  typia.assert(deleter);

  // Register a second admin account to act as the "user" to be deleted
  // (We have no API for non-admin user creation in this test scope)
  const adminJoin2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const target: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin2 });
  typia.assert(target);

  // Switch back to original deleter (already authenticated)
  // Delete the target admin (soft-delete)
  await api.functional.todoList.admin.users.erase(connection, {
    userId: target.id,
  });
  // Attempting to delete the same admin again should fail (already deleted / not found)
  await TestValidator.error(
    "should not be able to delete already-deleted user",
    async () => {
      await api.functional.todoList.admin.users.erase(connection, {
        userId: target.id,
      });
    },
  );

  // Try deleting a completely random (non-existent) userId
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should not be able to delete non-existent user",
    async () => {
      await api.functional.todoList.admin.users.erase(connection, {
        userId: randomUserId,
      });
    },
  );
}
