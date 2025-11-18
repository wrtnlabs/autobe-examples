import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user can successfully create a Todo item.
 *
 * 1. Registers a new user, capturing their credentials and authentication token.
 * 2. Authenticates with this user context for subsequent calls.
 * 3. Creates a Todo item with valid description (not blank, <=250 chars).
 * 4. Optionally sets a future due_date; also tests absence of due_date.
 * 5. Asserts all required system fields (id, timestamps, completed=false,
 *    ownership).
 * 6. Confirms that the returned Todo belongs exclusively to the authenticated
 *    user.
 * 7. Runs full DTO validation and business rule assertions.
 */
export async function test_api_todolist_todo_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (join)
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A!",
    href: "https://app.example.com/join",
    referrer: "https://www.example.com/start",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userBody });
  typia.assert(authorizedUser);

  // 2. Prepare valid Todo descriptions and two due_date variants
  const description = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 16,
  }).slice(0, 250);
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  // 3. Create first Todo with a due_date
  const todoWithDueDateBody = {
    description,
    due_date: futureDate,
  } satisfies ITodoListTodo.ICreate;
  const todoWithDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoWithDueDateBody,
    });
  typia.assert(todoWithDueDate);
  TestValidator.equals(
    "created todo description matches input",
    todoWithDueDate.description,
    description,
  );
  TestValidator.equals(
    "created todo due_date matches input",
    todoWithDueDate.due_date,
    futureDate,
  );
  TestValidator.equals(
    "created todo completed is false by default",
    todoWithDueDate.completed,
    false,
  );
  TestValidator.equals(
    "created todo completed_at is absent/null",
    todoWithDueDate.completed_at,
    null,
  );
  TestValidator.equals(
    "created todo is linked to correct user",
    todoWithDueDate.user.id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "created todo timestamps are set",
    typeof todoWithDueDate.created_at === "string" &&
      typeof todoWithDueDate.updated_at === "string",
  );
  TestValidator.equals(
    "todo id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoWithDueDate.id,
    ),
    true,
  );

  // 4. Create a second Todo with no due_date (omitted)
  const description2 =
    description.length >= 247
      ? description.slice(0, 245) + "!$" // ensure uniqueness and <250 char
      : description + "!$";
  const todoNoDueDateBody = {
    description: description2,
    // due_date omitted
  } satisfies ITodoListTodo.ICreate;
  const todoNoDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoNoDueDateBody,
    });
  typia.assert(todoNoDueDate);
  TestValidator.equals(
    "created (nodue) todo description matches input",
    todoNoDueDate.description,
    description2,
  );
  TestValidator.equals(
    "created (nodue) todo has no due_date",
    todoNoDueDate.due_date,
    undefined,
  );
  TestValidator.equals(
    "created (nodue) todo completed is false",
    todoNoDueDate.completed,
    false,
  );
  TestValidator.equals(
    "created (nodue) todo completed_at is absent/null",
    todoNoDueDate.completed_at,
    null,
  );
  TestValidator.equals(
    "created (nodue) todo is linked to same user",
    todoNoDueDate.user.id,
    authorizedUser.id,
  );
}
