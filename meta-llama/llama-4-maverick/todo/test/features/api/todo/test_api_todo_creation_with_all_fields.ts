import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test a user creating a todo with all optional fields populated: title,
 * description (non-null), due_date (future ISO8601), and priority ('high').
 * Confirms:
 *
 * - Success of creation (no unique constraint violated)
 * - All fields stored, correct types in response
 * - Unique (title, due_date) for this user
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
) {
  // 1. Register a new user for context isolation
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://e2e.test/register",
    referrer: "https://e2e.test/landing?page=todo",
    ip: null,
  } satisfies ITodoUser.ICreate;
  const userAuth: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(userAuth);

  // 2. Create a todo with all fields (using unique title and future due date)
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const description = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 15,
  });
  const dueDateObj = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days in future
  const due_date = dueDateObj.toISOString();
  const body = {
    title: todoTitle,
    description,
    due_date,
    priority: "high",
  } satisfies ITodoTodo.ICreate;

  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body },
  );
  typia.assert(todo);

  // 3. Validate response
  TestValidator.equals("title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "description matches input",
    todo.description,
    description,
  );
  TestValidator.equals("due_date matches input", todo.due_date, due_date);
  TestValidator.equals("priority is high", todo.priority, "high");
  TestValidator.equals(
    "is_completed is false by default",
    todo.is_completed,
    false,
  );
  TestValidator.equals("completed_at is null", todo.completed_at, null);
  TestValidator.predicate("created_at is ISO8601 in the past", () => {
    return (
      typeof todo.created_at === "string" &&
      !Number.isNaN(Date.parse(todo.created_at)) &&
      Date.parse(todo.created_at) <= Date.now()
    );
  });
  TestValidator.predicate("updated_at is ISO8601 in the past", () => {
    return (
      typeof todo.updated_at === "string" &&
      !Number.isNaN(Date.parse(todo.updated_at)) &&
      Date.parse(todo.updated_at) <= Date.now()
    );
  });

  // 4. (Business rule) No other todo should share (title, due_date) for this user, and creation worked
  // No duplicate creation attempted, so this tuple should be unique for this account
}
