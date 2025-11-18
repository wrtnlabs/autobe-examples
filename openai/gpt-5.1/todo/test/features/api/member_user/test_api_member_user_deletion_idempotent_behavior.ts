import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate idempotent and secure behavior of member user deletion by an admin.
 *
 * This test exercises the lifecycle around deleting a member user account from
 * the admin side and repeated deletion attempts, while also checking that
 * unauthenticated callers cannot perform the deletion.
 *
 * High-level steps:
 *
 * 1. Register and log in a new member user, capturing the member user id.
 * 2. As that member user, create a couple of todos to simulate a realistic
 *    account.
 * 3. Register an admin user (adminUser.join), which automatically authenticates
 *    the connection as that admin.
 * 4. As the admin, call erase(memberUserId) once and ensure the operation
 *    completes without throwing.
 * 5. As the same admin, attempt to erase(memberUserId) again and verify that an
 *    error is thrown using TestValidator.error, treating the second call as
 *    deleting an already deleted or non-existent account.
 * 6. Build a separate unauthenticated connection by cloning the original
 *    connection with empty headers, and verify that calling erase(memberUserId)
 *    on that unauthenticated connection also fails via TestValidator.error.
 *
 * The test focuses on behavioral guarantees:
 *
 * - Admin can delete an existing member user once.
 * - Repeated deletion attempts do not succeed silently and instead surface an
 *   error in a generic way (we do not check status codes).
 * - Unauthenticated callers cannot delete member users at all.
 */
export async function test_api_member_user_deletion_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain its id
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberUserId: string & tags.Format<"uuid"> = memberAuth.id;

  // 2. As the member user, create a couple of todos for realism
  const todoBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBody1,
    });
  typia.assert(todo1);

  const todoBody2 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
  } satisfies ITodoAppTodo.ICreate;

  const todo2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBody2,
    });
  typia.assert(todo2);

  // 3. Register an admin user; this call authenticates the connection as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 4. First deletion as admin should succeed without throwing
  await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
    memberUserId,
  });

  // 5. Second deletion as admin is expected to result in an error
  await TestValidator.error(
    "second deletion of same member user should fail",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
        memberUserId,
      });
    },
  );

  // 6. Unauthenticated caller must not be able to delete member users
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated deletion attempt should fail",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.erase(
        unauthenticatedConnection,
        {
          memberUserId,
        },
      );
    },
  );
}
