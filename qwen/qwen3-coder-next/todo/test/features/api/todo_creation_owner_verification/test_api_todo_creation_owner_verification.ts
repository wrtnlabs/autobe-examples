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

export async function test_api_todo_creation_owner_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<ITodoAppMemberSession.IJoin>();
  const authorized = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authorized);
  const member = authorized.member;
  // 2. Create a todo item with the authenticated member
  const todoBody: ITodoAppTodo.ICreate = {
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 86400000).toISOString(),
  };
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: todoBody,
    },
  );
  typia.assert(todo);
  // 3. Verify user summary in created todo matches creating member
  TestValidator.equals(
    "user id matches creating member",
    todo.user.id,
    member.id,
  );
  TestValidator.equals(
    "user email matches creating member",
    todo.user.email,
    member.email,
  );
  // 4. Verify created todo has expected fields
  TestValidator.equals("title matches input", todo.title, todoBody.title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    todoBody.description,
  );
  TestValidator.predicate(
    "is_complete is false by default",
    todo.is_complete === false,
  );
  TestValidator.predicate(
    "is_trashed is false by default",
    todo.is_trashed === false,
  );
}
