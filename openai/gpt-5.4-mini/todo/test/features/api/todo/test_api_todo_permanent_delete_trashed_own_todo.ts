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

export async function test_api_todo_permanent_delete_trashed_own_todo(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify permanent deletion of a trashed private todo owned by the authenticated member.
   *
   * 1. Registers a private member and establishes an actor-specific authenticated connection.
   * 2. Creates a private todo using the member-owned todo generation utility.
   * 3. Moves the todo to trash and then permanently deletes it.
   * 4. Confirms the permanent-delete call succeeds without throwing.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  await api.functional.todoApp.member.todos.permanent_delete.erase(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
}
