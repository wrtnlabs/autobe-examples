import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that a newly registered user can create a todo with only the required
 * title field, omitting all optional fields. The test verifies:
 *
 * 1. The todo is created for the correct user.
 * 2. Default values are set (is_completed should be false).
 * 3. The API response includes the correct data.
 */
export async function test_api_todo_creation_valid_basic(
  connection: api.IConnection,
) {
  // 1. Register a new user (setup authentication context)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  const joinBody = {
    email,
    password,
    href: href satisfies string & tags.Format<"uri">,
    referrer: referrer satisfies string & tags.Format<"uri">,
  } satisfies ITodoUser.ICreate;
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. Create a todo with only required title (omit all optionals):
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 12,
  }) satisfies string & tags.MaxLength<255>;
  const todoBody = { title } satisfies ITodoTodo.ICreate;
  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoBody },
  );
  typia.assert(todo);

  // 3. Validate ownership (user_id should match registered user), field presence, and default values
  TestValidator.equals("Todo assigned to correct user", todo.user_id, user.id);
  TestValidator.equals("Todo title matches input", todo.title, title);
  TestValidator.equals("Todo description missing", todo.description, null);
  TestValidator.equals("Todo due_date missing", todo.due_date, null);
  TestValidator.equals("Todo priority missing", todo.priority, null);
  TestValidator.equals(
    "Todo completion status is false by default",
    todo.is_completed,
    false,
  );
  TestValidator.equals("Todo completed_at missing", todo.completed_at, null);
  // created_at and updated_at must be present (ISO string), typia.assert already checked types
  TestValidator.predicate(
    "Todo has created_at",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "Todo has updated_at",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );
}
