import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_permanent_delete_other_member_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a member cannot permanently delete another member's trashed todo.
   *
   * This scenario creates two isolated member sessions, creates and trashes a todo
   * under the first member, and then attempts to permanently delete that todo
   * while authenticated as the second member. The test validates the ownership
   * boundary for trash-only deletion and ensures the unauthorized call is rejected.
   *
   * 1. Member A joins the private todo app and creates a todo.
   * 2. Member A moves the todo to trash so it becomes eligible for permanent deletion.
   * 3. Member B joins as a separate account and attempts the permanent delete.
   * 4. The unauthorized delete is rejected.
   */
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  await TestValidator.httpError(
    "member B cannot permanently delete member A's trashed todo",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.permanent_delete.erase(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
