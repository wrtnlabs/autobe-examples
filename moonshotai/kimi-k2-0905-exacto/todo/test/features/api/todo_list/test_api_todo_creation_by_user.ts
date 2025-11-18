import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a new todo item by an authenticated user.
 *
 * This test covers the full scenario of registering a new user with a unique
 * email and password, authenticating (which happens implicitly during
 * registration), and then creating a single todo with valid random data. It
 * validates correct user association, checks description and completion
 * constraints, and ensures the todo's returned structure matches all required
 * properties.
 *
 * 1. Register a unique user (email + password)
 * 2. User is authenticated via registration response
 * 3. Create a todo (random description ≤255 chars, random completion)
 * 4. Assert the todo is returned as specified and matches user context
 * 5. Validate todo constraints (structure, types, description, ownership)
 */
export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a user with a unique email
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: { email, password } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userAuth);
  TestValidator.equals("registered user email matches", userAuth.email, email);
  TestValidator.predicate(
    "account is not locked",
    userAuth.is_locked === false,
  );
  // 2. userAuth.token is now set in connection headers (implicit login)
  // 3. Create a todo for the authenticated user
  const description = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 40,
  });
  const completed = RandomGenerator.pick([true, false] as const);
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: { description, completed } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  // 4. Validate fields
  TestValidator.equals(
    "todo description matches",
    todo.description,
    description,
  );
  TestValidator.equals(
    "todo completed flag matches",
    todo.completed,
    completed,
  );
  TestValidator.predicate(
    "todo id is uuid format",
    typeof todo.id === "string" && todo.id.length === 36,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );
  TestValidator.equals(
    "completed_at null for incomplete todos",
    todo.completed ? typeof todo.completed_at === "string" : todo.completed_at,
    todo.completed ? todo.completed_at : null,
  );
  TestValidator.equals("deleted_at is null on creation", todo.deleted_at, null);
  // 5. Business logic checks
  TestValidator.predicate(
    "description non-empty and ≤255 chars",
    todo.description.trim().length > 0 && todo.description.length <= 255,
  );
}
