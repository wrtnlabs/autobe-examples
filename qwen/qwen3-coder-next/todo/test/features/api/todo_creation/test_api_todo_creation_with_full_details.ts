import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_creation_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user to get authentication tokens
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials: ITodoAppUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  };
  const userResponse = await api.functional.todoApp.auth.user.join(
    userConnection,
    { body: userCredentials },
  );
  typia.assert(userResponse);
  // Update connection with auth token from registration
  userConnection.headers = { Authorization: userResponse.token.access };
  // 2. Create todo with all optional fields
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 2);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const createBody: ITodoAppTodo.ICreate = {
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    startDate: startDate.toISOString(),
    dueDate: dueDate.toISOString(),
  };
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);
  // 3. Validate todo properties
  TestValidator.equals("title matches", todo.title, createBody.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    createBody.description,
  );
  TestValidator.equals(
    "startDate matches",
    todo.start_date,
    createBody.startDate,
  );
  TestValidator.equals("dueDate matches", todo.due_date, createBody.dueDate);
  TestValidator.equals("isComplete is false", todo.is_complete, false);
  TestValidator.equals("isDeleted is false", todo.is_deleted, false);
  TestValidator.predicate("created_at exists", todo.created_at !== undefined);
  TestValidator.predicate("updated_at exists", todo.updated_at !== undefined);
  TestValidator.equals(
    "user relationship exists",
    todo.user.id !== undefined,
    true,
  );
  TestValidator.predicate(
    "user displayName exists",
    todo.user.displayName !== undefined,
  );
  // 4. Validate date formats are ISO 8601
  TestValidator.predicate("startDate is valid date-time format", () => {
    return !isNaN(Date.parse(todo.start_date!));
  });
  TestValidator.predicate("dueDate is valid date-time format", () => {
    return !isNaN(Date.parse(todo.due_date!));
  });
}
