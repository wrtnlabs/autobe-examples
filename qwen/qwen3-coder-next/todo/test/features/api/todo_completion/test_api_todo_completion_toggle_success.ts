import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_todo_completion_toggle_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string>() as string,
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_member_login(loginConnection, {
    body: {
      email: joined.member.email,
      password: "Password123!",
    } satisfies ITodoAppMemberSession.ILogin,
  });
  typia.assert(logged);
  // 2. Create a todo item
  const todo = await api.functional.todoApp.member.todos.create(
    loginConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Toggle completion to true
  const completed =
    await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
      loginConnection,
      {
        todoId: todo.id,
        body: {
          is_complete: true,
        } satisfies ITodoAppTodo.IToggleComplete,
      },
    );
  typia.assert(completed);
  // 4. Toggle completion to false
  const incomplete =
    await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
      loginConnection,
      {
        todoId: todo.id,
        body: {
          is_complete: false,
        } satisfies ITodoAppTodo.IToggleComplete,
      },
    );
  typia.assert(incomplete);
  // 5. Toggle back to true
  const recompleted =
    await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
      loginConnection,
      {
        todoId: todo.id,
        body: {
          is_complete: true,
        } satisfies ITodoAppTodo.IToggleComplete,
      },
    );
  typia.assert(recompleted);
}
