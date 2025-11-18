import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates end-to-end permanent user account deletion as a platform
 * administrator.
 *
 * This test covers the following workflow:
 *
 * 1. Admin authenticates (registration/login request to obtain privilege context).
 * 2. Admin creates a second admin user (as target to delete), so we have a target
 *    user account.
 * 3. Perform DELETE /todoList/admin/users/{userId} as the authenticated admin,
 *    deleting the target admin.
 * 4. Verify that the deleted admin cannot be re-fetched (e.g., by attempting an
 *    action and/or re-joining with the same email).
 * 5. Optionally, attempt to authenticate as the deleted admin (should fail if
 *    credential is still used).
 * 6. Confirm that deletion is irreversible for user identity.
 */
export async function test_api_admin_user_account_permanent_deletion(
  connection: api.IConnection,
) {
  // 1. Register acting admin (who will execute deletion)
  const actingAdminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin.platform.example.com/join",
    referrer: "https://admin.platform.example.com/dashboard",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;

  const actingAdmin = await api.functional.auth.admin.join(connection, {
    body: actingAdminInput,
  });
  typia.assert(actingAdmin);
  TestValidator.equals(
    "acting admin email should match",
    actingAdmin.email,
    actingAdminInput.email,
  );

  // 2. Register target admin to later delete
  const targetAdminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin.platform.example.com/join",
    referrer: "https://admin.platform.example.com/dashboard",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;

  const targetAdmin = await api.functional.auth.admin.join(connection, {
    body: targetAdminInput,
  });
  typia.assert(targetAdmin);
  TestValidator.equals(
    "target admin email should match",
    targetAdmin.email,
    targetAdminInput.email,
  );

  // 3. Acting admin erases target admin's account (use the privilege context; cannot self-delete)
  await api.functional.todoList.admin.users.erase(connection, {
    userId: targetAdmin.id,
  });

  // 4. Attempt to re-register target admin with same email (should succeed, as permanent deletion re-allows email reuse)
  const targetAdminInput2 = { ...targetAdminInput };
  const rejoinedAdmin = await api.functional.auth.admin.join(connection, {
    body: targetAdminInput2,
  });
  typia.assert(rejoinedAdmin);
  TestValidator.equals(
    "target admin email can be reused after permanent delete",
    rejoinedAdmin.email,
    targetAdminInput.email,
  );

  // 5. Optionally attempt to delete the already deleted user again (should fail)
  await TestValidator.error(
    "cannot delete user that no longer exists in system",
    async () => {
      await api.functional.todoList.admin.users.erase(connection, {
        userId: targetAdmin.id,
      });
    },
  );
}
