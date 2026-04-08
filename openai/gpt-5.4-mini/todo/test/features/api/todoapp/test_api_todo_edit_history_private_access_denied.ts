import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_private_access_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that todo edit history is private to its owner.
   *
   * This scenario verifies that a member cannot access another member's todo
   * edit history endpoint and infer whether the foreign todo exists. The test
   * creates two isolated members, prepares a todo under the second member, and
   * confirms the first member receives a not-found style HTTP error when using
   * the foreign todo identifier.
   *
   * 1. Register two distinct members with isolated connections.
   * 2. Create a todo for the second member.
   * 3. Attempt cross-user edit-history access from the first member.
   * 4. Confirm the unauthorized request is rejected as not found.
   */
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: `${RandomGenerator.name()} ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await TestValidator.httpError(
    "foreign todo edit history access should be denied as not found",
    [404],
    async () => {
      await api.functional.todoApp.member.todos.editHistories.index(
        memberAConnection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoEditHistory.IRequest,
        },
      );
    },
  );
}
