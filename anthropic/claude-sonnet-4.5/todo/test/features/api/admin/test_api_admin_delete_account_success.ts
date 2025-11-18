import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate permanent deletion of an administrator account by a privileged
 * admin.
 *
 * This test covers the complete flow for securely registering a new
 * administrator and then irreversibly deleting that admin account.
 *
 * Steps:
 *
 * 1. Register a new admin account (via POST /auth/admin/join)
 * 2. Verify registration and authenticate as the created admin
 * 3. Permanently delete the admin account (via DELETE
 *    /todoList/admin/admins/{adminId})
 * 4. (Implicit) Confirm deletion via lack of recoverability
 *
 * Business rationale: Erasing privileged admin accounts must be fully secure,
 * audit logged, and irreversible by normal means. This flow guarantees the user
 * cannot authenticate or recover the account post-deletion.
 */
export async function test_api_admin_delete_account_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (this will also authenticate the session)
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
    ip: null, // optional: omit for audit - backend will capture
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(admin);

  // 2. Delete the admin account using its own ID
  await api.functional.todoList.admin.admins.erase(connection, {
    adminId: admin.id,
  });

  // 3. Attempt to reuse this account for authentication: expect failure (non-recoverable)
  await TestValidator.error(
    "deleted admin account cannot authenticate again",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: registrationBody,
      });
    },
  );
}
