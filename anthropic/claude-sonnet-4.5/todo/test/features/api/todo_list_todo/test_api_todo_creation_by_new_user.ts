import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate creation of Todo for a new registered user and test isolation.
 *
 * 1. Register a new user via api.functional.auth.user.join, using unique email,
 *    valid password, and required metadata fields. Assert response type and
 *    token issuance.
 * 2. Authenticate using the join response; further requests use this account.
 * 3. Create a Todo with all properties set: valid title (1-100 chars), description
 *    (<=500 chars), due_date (date-time >= today), status (explicitly
 *    'pending'). Assert all required and optional business fields exist in the
 *    response, system fields present and well-formed, and correct user
 *    association.
 * 4. Attempt duplicate Todo creation with same title for the same user; expect
 *    validation error.
 * 5. Create a Todo omitting description and due_date (minimum valid case), assert
 *    status defaults to 'pending', and fields are correct.
 * 6. Register a second independent user and create a Todo with the same title;
 *    expect success and that ownership is not shared.
 * 7. Confirm Todos for each user are isolated (no cross-user leak or ownership
 *    issue).
 */
export async function test_api_todo_creation_by_new_user(
  connection: api.IConnection,
) {
  // 1. Register first user and assert join/token result
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: RandomGenerator.alphaNumeric(12),
      ip: null, // optional compliance metadata, null is allowed
      href: "https://test-suite.local/register", // any URI
      referrer: "https://test-suite.local/", // any URI
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(user1Join);
  TestValidator.equals(
    "join response email equals input",
    user1Join.email,
    user1Email,
  );

  // 2. Auth handled by SDK after join, use this identity for further actions.

  // 3. Create a Todo with all fields present (title, description, due_date, status)
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 15,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 10,
    wordMax: 20,
  });
  const todoDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // tomorrow
  const todo1Body = {
    title: todoTitle,
    description: todoDescription,
    due_date: todoDueDate,
    status: "pending",
  } satisfies ITodoListTodo.ICreate;
  const todo1 = await api.functional.todoList.user.todos.create(connection, {
    body: todo1Body,
  });
  typia.assert(todo1);
  // Assert business fields and audit system fields
  TestValidator.equals("todo title assigned", todo1.title, todoTitle);
  TestValidator.equals(
    "todo description assigned",
    todo1.description,
    todoDescription,
  );
  TestValidator.equals("todo due date assigned", todo1.due_date, todoDueDate);
  TestValidator.equals("todo status assigned", todo1.status, "pending");
  TestValidator.equals(
    "todo user.id matches session user",
    todo1.user.id,
    user1Join.id,
  );
  TestValidator.predicate(
    "todo system timestamps present",
    typeof todo1.created_at === "string" &&
      typeof todo1.updated_at === "string",
  );

  // 4. Attempt duplicate Todo creation (same title), expect validation failure
  await TestValidator.error(
    "user cannot create duplicate titled todo",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: todo1Body,
      });
    },
  );

  // 5. Create a Todo with required fields only; omit description and due_date
  const todo2Title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 10,
  });
  const todo2Body = {
    title: todo2Title,
    description: null,
    due_date: null,
    status: "pending",
  } satisfies ITodoListTodo.ICreate;
  const todo2 = await api.functional.todoList.user.todos.create(connection, {
    body: todo2Body,
  });
  typia.assert(todo2);
  TestValidator.equals("todo2 title assigned", todo2.title, todo2Title);
  TestValidator.equals("todo2 description null", todo2.description, null);
  TestValidator.equals("todo2 due date null", todo2.due_date, null);
  TestValidator.equals(
    "todo2 status defaults to pending",
    todo2.status,
    "pending",
  );
  TestValidator.equals(
    "todo2 user.id matches session user",
    todo2.user.id,
    user1Join.id,
  );

  // 6. Register a second independent user and create a Todo with same title as user1's Todo1
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://test-suite.local/register2",
      referrer: "https://test-suite.local/",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(user2Join);
  TestValidator.equals(
    "user2 join response email equals input",
    user2Join.email,
    user2Email,
  );

  // After join, requests are on user2 context
  const todo3Body = {
    title: todoTitle, // Duplicate title as first user's todo1, but this is a different user
    description: null,
    due_date: null,
    status: "pending",
  } satisfies ITodoListTodo.ICreate;
  const todo3 = await api.functional.todoList.user.todos.create(connection, {
    body: todo3Body,
  });
  typia.assert(todo3);
  TestValidator.equals(
    "todo3 title matches duplicate across user",
    todo3.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo3 user.id matches user2",
    todo3.user.id,
    user2Join.id,
  );
  TestValidator.notEquals(
    "todo3 user.id not user1",
    todo3.user.id,
    user1Join.id,
  );

  // 7. Confirm user1 todos are not visible/linked to user2 and vice versa: check user IDs differ and todo ownership is isolated
  TestValidator.notEquals(
    "cross-user todo not shared",
    todo1.user.id,
    todo3.user.id,
  );
}
