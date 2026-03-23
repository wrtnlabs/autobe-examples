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

export async function test_api_member_todo_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinBody = {
    email: (typia.random<string & tags.Format<"email">>() satisfies string as string) as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMemberSession.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  // 2. Login to get authenticated session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginSession = await authorize_member_login(loginConnection, {
    body: {
      email: memberSession.member.email,
      password: joinBody.password,
    } satisfies ITodoAppMemberSession.ILogin,
  });
  // 3. Create a todo item
  const createBody = {
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
  } satisfies ITodoAppTodo.ICreate;
  const todoConnection: api.IConnection = { host: connection.host };
  const createdTodo = await generate_random_todo_app_member_todos_create(
    todoConnection,
    {
      body: createBody,
    },
  );
  // 4. Retrieve the todo
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    todoConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 5. Validate
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "start_date matches",
    retrievedTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date matches",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "is_complete matches",
    retrievedTodo.is_complete,
    createdTodo.is_complete,
  );
  TestValidator.equals(
    "is_trashed matches",
    retrievedTodo.is_trashed,
    createdTodo.is_trashed,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedTodo.deleted_at,
    createdTodo.deleted_at,
  );
  // Validate user ownership
  TestValidator.equals(
    "user ID matches",
    retrievedTodo.user.id,
    createdTodo.user.id,
  );
  TestValidator.equals(
    "user email matches",
    retrievedTodo.user.email,
    createdTodo.user.email,
  );
}