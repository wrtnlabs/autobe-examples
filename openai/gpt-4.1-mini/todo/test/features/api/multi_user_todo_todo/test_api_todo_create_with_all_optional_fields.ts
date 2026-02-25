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

export async function test_api_todo_create_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario:
   * 1. Create a new user by calling authorize_user_join with randomized details.
   * 2. Use the returned authorized token to create an actor-specific connection.
   * 3. Construct a todo creation body with all optional fields (title, description, startDate, dueDate) populated.
   * 4. Call generate_random_multi_user_todo_user_todos_create function to create the todo.
   * 5. Validate the response using typia.assert.
   * 6. Verify the todo's properties match the sent body.
   * 7. Confirm that the todo's user id matches the authorized user's id.
   * 8. Confirm the 'completed' field is false by default.
   */
  // Step 1: User join
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://referrer.com/previous",
    ip: undefined,
  };
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Step 2: Update userConnection headers with token
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // Step 3: Prepare todo create body with all optional fields
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(
    now.getTime() + oneDayMs,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const dueDate = new Date(
    now.getTime() + 2 * oneDayMs,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const createBody: IMultiUserTodoTodo.ICreate = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    startDate: startDate,
    dueDate: dueDate,
  };
  // Step 4: Create todo
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    { body: createBody },
  );
  typia.assert(todo);
  // Step 5: Assertions
  TestValidator.equals("todo title matches", todo.title, createBody.title);
  TestValidator.equals(
    "todo description matches",
    todo.description,
    createBody.description,
  );
  TestValidator.equals(
    "todo startDate matches",
    todo.startDate,
    createBody.startDate,
  );
  TestValidator.equals(
    "todo dueDate matches",
    todo.dueDate,
    createBody.dueDate,
  );
  TestValidator.equals(
    "todo user id matches authorized user id",
    todo.user.id,
    authorized.id,
  );
  TestValidator.equals(
    "todo completed is false by default",
    todo.completed,
    false,
  );
}
