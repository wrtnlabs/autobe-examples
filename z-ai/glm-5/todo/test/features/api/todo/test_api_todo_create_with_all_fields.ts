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
 * Test creating a todo item with all fields populated.
 *
 * This test verifies that:
 * 1. A todo can be created with title, description, startDate, and dueDate
 * 2. The response includes all expected fields with correct values
 * 3. Default values (isCompleted=false, isDeleted=false) are set correctly
 * 4. The todo is properly associated with the authenticated user
 * 5. All formatting in title and description is preserved exactly
 */
export async function test_api_todo_create_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // 2. Prepare test data with all fields populated
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const description = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const dueDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // One week from now
  const createBody = {
    title,
    description,
    startDate,
    dueDate,
  } satisfies ITodoAppTodo.ICreate;
  // 3. Create the todo with all fields
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: createBody,
  });
  typia.assert(todo);
  // 4. Verify response fields
  // 4.1 Verify ID is a valid UUID
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  // 4.2 Verify title and description are preserved exactly
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    description,
  );
  // 4.3 Verify dates are in ISO 8601 format and match input
  TestValidator.equals("startDate matches input", todo.startDate, startDate);
  TestValidator.equals("dueDate matches input", todo.dueDate, dueDate);
  // 4.4 Verify default status values
  TestValidator.equals("isCompleted is false", todo.isCompleted, false);
  TestValidator.equals("isDeleted is false", todo.isDeleted, false);
  // 4.5 Verify user association
  TestValidator.equals(
    "user id matches authenticated user",
    todo.user.id,
    authResult.id,
  );
  TestValidator.equals(
    "user displayName matches",
    todo.user.displayName,
    authResult.display_name,
  );
  // 4.6 Verify timestamps exist and are valid ISO 8601 dates
  TestValidator.predicate(
    "createdAt is valid ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      todo.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      todo.updatedAt,
    ),
  );
}
