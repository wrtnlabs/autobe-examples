import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_creation_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A and get an authenticated connection
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Member B and get a separate authenticated connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. As Member A, create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "Member A's private task",
        description: "This should never be visible to Member B",
      },
    },
  );
  typia.assert(todo);
  // 4. Assert that the todo is owned by Member A
  TestValidator.equals(
    "todo owner is Member A",
    todo.todo_app_member_id,
    memberA.id,
  );
  // 5. As Member B, retrieve the todo list
  const memberBTodos = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTodos);
  // 6. Assert that Member A's todo is NOT in Member B's todo list
  const memberATodoInBList = memberBTodos.data.find(
    (item) => item.id === todo.id,
  );
  TestValidator.predicate(
    "Member A's todo is not visible to Member B",
    memberATodoInBList === undefined,
  );
}
