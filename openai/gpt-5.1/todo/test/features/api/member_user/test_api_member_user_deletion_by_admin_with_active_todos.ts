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
 * Validate that an admin user can delete a member user who has active todos,
 * and that the operation is restricted to administrative context.
 *
 * Business flow covered by this test:
 *
 * 1. A new member user signs up.
 * 2. The member user, under their own authenticated session, creates at least one
 *    todo.
 * 3. A new admin user signs up, switching the SDK connection context to an admin.
 * 4. The admin deletes the member user account via the admin-only erase endpoint.
 * 5. An authorization boundary check is performed by attempting the erase
 *    operation when authenticated as a member user and expecting failure.
 *
 * Limitations:
 *
 * - There is no read API to verify the post-deletion state of the member user or
 *   their todos, so the test focuses on success (no error) for the admin case
 *   and failure for the member-user case.
 */
export async function test_api_member_user_deletion_by_admin_with_active_todos(
  connection: api.IConnection,
) {
  // 1. Register a new member user and capture their id and token context.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/member/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Under member user context, create at least one todo.
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(todo);

  // Business validations for the created todo.
  TestValidator.equals(
    "todo must belong to the joined member user",
    todo.memberUser.id,
    memberUserId,
  );
  TestValidator.predicate(
    "todo status must be non-empty",
    typeof todo.status === "string" && todo.status.length > 0,
  );
  TestValidator.equals(
    "newly created todo should not be soft-deleted",
    todo.deleted_at ?? null,
    null,
  );

  // 3. Register a new admin user, which will switch connection context to admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, delete the member user; this must succeed without throwing.
  await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
    memberUserId: memberUserId,
  });

  // 5. Authorization boundary check: member users must not be able to delete
  // member accounts. Re-authenticate as a (new) member user and expect erase
  // to fail.
  const secondMemberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/member/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const secondMemberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondMemberJoinBody,
    });
  typia.assert(secondMemberAuthorized);

  await TestValidator.error(
    "member user must not be authorized to erase member users",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
        memberUserId: memberUserId,
      });
    },
  );
}
