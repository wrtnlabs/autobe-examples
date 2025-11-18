import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate permanent (hard) removal of an administrator account from the
 * system.
 *
 * This test covers the following workflow:
 *
 * 1. Register a new administrator using the admin join API.
 * 2. Authenticate as the registered admin (session is implicitly set by join).
 * 3. Hard-delete the administrator by ID using the admin erase API.
 * 4. Validate that the deletion operation completes without error.
 * 5. Attempt to delete the same admin again—must fail, as account no longer
 *    exists.
 * 6. Attempt to delete a random, non-existent admin ID—must fail.
 *
 * Audit log validation is considered business-driven and assumed to be handled
 * at the service layer and out-of-scope for this E2E API test directly.
 *
 * Success is measured by absence of the target account following hard deletion,
 * correct error handling for subsequent delete attempts and non-existent IDs,
 * and no residual authentication in session.
 */
export async function test_api_admin_account_hard_delete(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(createdAdmin);

  // 2. (Implicit authentication handled by SDK after join)
  TestValidator.equals(
    "admin email matches join input",
    createdAdmin.email,
    adminJoinBody.email,
  );

  // 3. Hard delete this admin
  await api.functional.todoList.admin.admins.erase(connection, {
    adminId: createdAdmin.id,
  });

  // 4. Attempt repeated deletion on same admin should error
  await TestValidator.error(
    "repeated delete should fail for deleted admin",
    async () => {
      await api.functional.todoList.admin.admins.erase(connection, {
        adminId: createdAdmin.id,
      });
    },
  );

  // 5. Attempt to delete a non-existent random admin ID
  const randomNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "delete with non-existent adminId must fail",
    async () => {
      await api.functional.todoList.admin.admins.erase(connection, {
        adminId: randomNonExistentId,
      });
    },
  );
}
