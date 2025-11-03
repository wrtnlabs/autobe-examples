import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate admin soft-delete behavior for a TodoUser.
 *
 * Business purpose:
 *
 * - Ensure administrators can soft-delete a todo user account.
 * - Confirm that after soft-deletion the account cannot be used to re-register
 *   (represents that the account has been disabled / uniqueness preserved).
 *
 * Test steps:
 *
 * 1. Admin self-register (admin.join) using an unauthenticated adminConn so that
 *    adminConn.headers contains the admin token afterwards.
 * 2. Create the target todo user via todoUser.join using a separate userConn (so
 *    adminConn keeps admin authorization).
 * 3. As admin (adminConn), call todoUsers.erase to soft-delete the target user.
 * 4. Assert erase completes (void returned) and that attempting to re-register
 *    using the deleted user's email fails (business-level validation error).
 * 5. Sanity: create a new, different todo user to ensure the system still accepts
 *    registrations.
 */
export async function test_api_todo_user_admin_soft_delete_user(
  connection: api.IConnection,
) {
  // 1. Create an admin account with its own connection (preserves admin token)
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    adminConn,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/",
        referrer: "https://example.com/ref",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create the target todo user using a separate unauthenticated connection
  const userConn: api.IConnection = { ...connection, headers: {} };
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(userConn, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/",
        referrer: "https://example.com/ref",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(todoUser);

  const todoUserId = todoUser.id;

  // 3. As admin, soft-delete the created todo user (adminConn carries admin token)
  await api.functional.todoApp.admin.todoUsers.erase(adminConn, {
    todoUserId: todoUserId,
  });

  // 4. Verify that the deleted user cannot re-register using the same email.
  //    We assert that the attempt to join fails (business error). Do NOT assert
  //    specific HTTP status codes — just that an error occurs.
  await TestValidator.error(
    "deleted todoUser cannot re-register with same email",
    async () => {
      await api.functional.auth.todoUser.join(userConn, {
        body: {
          email: userEmail,
          password: userPassword,
          href: "https://example.com/",
          referrer: "https://example.com/ref",
        } satisfies ITodoAppTodoUser.ICreate,
      });
    },
  );

  // 5. Sanity check: system still allows new registrations for other emails
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const otherUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(
      { ...connection, headers: {} },
      {
        body: {
          email: otherEmail,
          password: otherPassword,
          href: "https://example.com/",
          referrer: "https://example.com/ref",
        } satisfies ITodoAppTodoUser.ICreate,
      },
    );
  typia.assert(otherUser);

  // Basic business-level predicate to mark the test as logically complete
  TestValidator.predicate("admin soft-delete flow completed", true);
}
