import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSnapshot";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test cross-user access control for todo edit history snapshots.
 *
 * Validates that members cannot access other members' todo edit history through the snapshots endpoint. This test ensures strict data isolation between user accounts by verifying that ownership verification prevents unauthorized access to another user's todo snapshots.
 *
 * The test follows this workflow:
 *
 * 1. Member A registers and authenticates
 * 2. Member A creates a todo task
 * 3. Member A edits the todo multiple times to generate edit history snapshots
 * 4. Member B registers and authenticates separately
 * 5. Member B attempts to access Member A's todo snapshots using the todo ID
 * 6. System must reject the request with appropriate error (404 or 403)
 *
 * This validates that the backend enforces proper ownership checks at the database query level and prevents cross-user data leakage through the edit history API.
 */
export async function test_api_todo_edit_history_access_control_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registration and authentication
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todoA = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // 3. Member A edits the todo multiple times to generate snapshots
  const update1 = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoA.id,
      body: {
        title: RandomGenerator.name(4),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update1);
  const update2 = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoA.id,
      body: {
        title: RandomGenerator.name(2),
        start_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update2);
  // Verify Member A can access their own snapshots
  const memberASnapshots =
    await api.functional.todoApp.member.todos.snapshots.index(
      memberAConnection,
      {
        todoId: todoA.id,
        body: {} satisfies ITodoAppSnapshot.IRequest,
      },
    );
  typia.assert(memberASnapshots);
  TestValidator.predicate(
    "member A has snapshots",
    memberASnapshots.data.length > 0,
  );
  // 4. Member B registration and authentication
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Member B attempts to access Member A's todo snapshots - must fail
  await TestValidator.httpError(
    "member B cannot access member A's todo snapshots",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.todos.snapshots.index(
        memberBConnection,
        {
          todoId: todoA.id,
          body: {} satisfies ITodoAppSnapshot.IRequest,
        },
      );
    },
  );
}
