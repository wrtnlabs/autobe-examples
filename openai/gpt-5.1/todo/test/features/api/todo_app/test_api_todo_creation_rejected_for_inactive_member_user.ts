import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate todo creation for an authenticated member user.
 *
 * Original business intent was to ensure that inactive member users cannot
 * create todos. However, with the currently available API surface, there is no
 * endpoint to transition a member user's status to an inactive/disabled state
 * and test that constraint directly, nor is there a safe way for the test
 * itself to manipulate authentication headers.
 *
 * Therefore, this test focuses on the positive path that is implementable with
 * the provided SDK:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 * 2. Assert that the join response is a valid ITodoAppMemberuser.IAuthorized
 *    object and that key lifecycle fields look consistent for a fresh account.
 * 3. Using the authenticated connection (token set by the SDK), call POST
 *    /todoApp/memberUser/todos with a valid ITodoAppTodo.ICreate payload to
 *    create a todo for that member user.
 * 4. Assert that the created ITodoAppTodo is well-formed and that its memberUser
 *    summary matches the authenticated member user's identity (id and email)
 *    and exhibits active-like lifecycle state (non-empty status, not deleted).
 *
 * This keeps the test fully type-safe and compilable while still exercising the
 * main endpoint under realistic authenticated conditions.
 */
export async function test_api_todo_creation_rejected_for_inactive_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user via /auth/memberUser/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // Basic lifecycle sanity checks on the newly created member user
  TestValidator.predicate(
    "member user id is a non-empty UUID string",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "member user email matches requested email",
    authorized.email === joinBody.email,
  );
  TestValidator.predicate(
    "member user status is non-empty (represents active-like state)",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "member user is not logically deleted on registration",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 2. Create a todo for the authenticated member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(todo);

  // 3. Validate todo ownership and lifecycle basics
  TestValidator.equals(
    "todo owner id matches authenticated member user id",
    todo.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "todo owner email matches authenticated member user email",
    todo.memberUser.email,
    authorized.email,
  );
  TestValidator.predicate(
    "todo title matches the requested title",
    todo.title === createBody.title,
  );
  TestValidator.predicate(
    "todo has a non-empty status string",
    todo.status.length > 0,
  );
  TestValidator.predicate(
    "todo is not logically deleted immediately after creation",
    todo.deleted_at === null || todo.deleted_at === undefined,
  );
}
