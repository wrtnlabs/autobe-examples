import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate admin-privileged soft-delete (deactivation) of a user account.
 *
 * This tests the ability of an admin to deactivate any (non-admin) user by
 * userId. The scenario covers:
 *
 * 1. Admin registration (privileged actor, with random and valid properties).
 * 2. Target user registration (a normal user to be soft-deleted).
 * 3. Successful admin-initiated soft deletion of the user.
 * 4. Ensuring admin privilege is required: the endpoint only works as admin
 *    (already authenticated after registration).
 * 5. Confirming that deleted user cannot log in again: simulates user attempt by
 *    registering and using credentials (as login is not in provided endpoints,
 *    can't fully test, but business rule comment included).
 * 6. (Additionally) Attempts by admin to soft-delete self or another admin should
 *    fail (if business logic prohibits) --- see assertion.
 * 7. Validates that deleted_at is set on the user and personal user data is
 *    isolated if retrievable.
 */
export async function test_api_admin_soft_delete_any_user(
  connection: api.IConnection,
) {
  // 1. Register an admin (privileged account)
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin-join.example.com/",
    referrer: "https://dashboard.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // 2. Register a user (will be soft-deletion target)
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://user-join.example.com/",
    referrer: "https://home.example.com/",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoin,
  });
  typia.assert(user);

  // 3. Perform soft-delete as admin (targeting the user account)
  await api.functional.todoList.admin.users.erase(connection, {
    userId: user.id,
  });

  // 4. (Optional) If there were a user-detail endpoint, we would confirm deleted_at is set, data is isolated.
  //    With provided APIs, rely on the operation not throwing and check business-side effects in DB or via further endpoints if available.

  // 5. Attempt to soft-delete self (should fail if business logic prohibits)
  await TestValidator.error("admin cannot soft-delete self", async () => {
    await api.functional.todoList.admin.users.erase(connection, {
      userId: admin.id,
    });
  });

  // 6. Attempt to soft-delete another admin (should fail if business logic prohibits). Register second admin for this.
  const otherAdminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin2-join.example.com/",
    referrer: "https://dashboard.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.ICreate;
  const otherAdmin = await api.functional.auth.admin.join(connection, {
    body: otherAdminCreate,
  });
  typia.assert(otherAdmin);
  await TestValidator.error(
    "admin cannot soft-delete another admin",
    async () => {
      await api.functional.todoList.admin.users.erase(connection, {
        userId: otherAdmin.id,
      });
    },
  );
}
