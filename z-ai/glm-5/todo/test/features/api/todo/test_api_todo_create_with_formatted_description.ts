import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test that todo creation preserves formatting in description field.
 * Create a todo with title and a description containing various formatting:
 * multiple consecutive spaces, line breaks (\n), tabs (\t), and mixed whitespace patterns.
 * Verify the response returns the description field with exact formatting preserved -
 * no trimming of internal whitespace, line breaks maintained, and all formatting
 * characters intact.
 */
export async function test_api_todo_create_with_formatted_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create description with various formatting patterns:
  //    - Multiple consecutive spaces
  //    - Line breaks (\n)
  //    - Tabs (\t)
  //    - Mixed whitespace patterns
  const formattedDescription =
    "Line one with    multiple   spaces\n\nLine two after blank line\n\tIndented line with tab\n\n   Indented with spaces and tab";
  // 3. Create todo with formatted description
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: "Todo with formatted description",
      description: formattedDescription,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 4. Verify formatting is preserved exactly character-for-character
  TestValidator.equals(
    "description preserved exactly",
    todo.description,
    formattedDescription,
  );
}
