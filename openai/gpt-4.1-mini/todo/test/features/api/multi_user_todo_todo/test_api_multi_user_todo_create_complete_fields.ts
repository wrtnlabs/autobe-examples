import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_multi_user_todo_create_complete_fields(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for a user successfully creating a new todo with all fields.
  // Due to the IMultiUserTodoTodo type being empty in the provided DTO definitions,
  // direct property accesses cannot be made without compilation errors.
  // Therefore, this test will perform user registration, todo creation, and
  // assert that the response matches the expected structure by typia.assert only.
  // 1. User registration for authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare todo creation body (without type checks on properties due to empty schemas)
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // We prepare data matching ICreate interface, but cannot assert properties due to empty schema
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: startDate.toISOString(),
    due_date: dueDate.toISOString(),
  } satisfies Partial<{
    title?: string;
    description?: string;
    start_date?: string;
    due_date?: string;
  }>;
  // 3. Create todo
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: todoBody,
    },
  );
  // 4. Assert todo response structure
  typia.assert(todo);
  // No further property assertions because IMultiUserTodoTodo type is empty.
}
