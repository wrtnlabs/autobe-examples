import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates todo item creation by an authenticated user in the Todo List
 * application.
 *
 * - Covers successful creation with valid required/optional fields and
 *   constraints (title: unique per user, 1-100 chars; description: ≤1000
 *   chars/null/omitted).
 * - Checks the resulting todo has initial status "incomplete", correct user, and
 *   timestamp fields.
 * - Verifies error handling for duplicate titles (for same user), missing/invalid
 *   title, title with whitespaces only, title >100 chars, overlong/invalid
 *   description, and null/omitted description.
 * - Checks that different users can use the same title independently.
 */
export async function test_api_todo_item_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Register first user
  const userEmail1 = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail1 as string &
        tags.MinLength<5> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(10) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      href: "https://app.todo-list.com/register",
      referrer: "https://app.todo-list.com/",
    },
  });
  typia.assert(user1);

  // Scenario 1: Successful creation (title+descr)
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 16,
  }).substring(0, 30);
  const todoDescr = RandomGenerator.paragraph({ sentences: 10 });
  const todo1 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle as string & tags.MinLength<1> & tags.MaxLength<100>,
      description: todoDescr as string & tags.MaxLength<1000>,
    },
  });
  typia.assert(todo1);
  TestValidator.equals("todo owner is correct", todo1.user.id, user1.id);
  TestValidator.equals("todo initial status", todo1.status, "incomplete");
  TestValidator.predicate(
    "has id",
    typeof todo1.id === "string" && todo1.id.length > 0,
  );
  TestValidator.predicate(
    "has created_at",
    typeof todo1.created_at === "string" && todo1.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    typeof todo1.updated_at === "string" && todo1.updated_at.length > 0,
  );
  TestValidator.equals("todo title set", todo1.title, todoTitle);
  TestValidator.equals("todo description set", todo1.description, todoDescr);

  // Scenario 2: Missing description (optional)
  const todo2title = "Title only";
  const todo2 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todo2title as string & tags.MinLength<1> & tags.MaxLength<100>,
    },
  });
  typia.assert(todo2);
  TestValidator.equals("todo2 owner is user1", todo2.user.id, user1.id);
  TestValidator.equals(
    "no description yields undefined/null",
    todo2.description,
    null,
  );

  // Scenario 3: Null description
  const todo3title = "Title with null desc";
  const todo3 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todo3title as string & tags.MinLength<1> & tags.MaxLength<100>,
      description: null,
    },
  });
  typia.assert(todo3);
  TestValidator.equals("todo3 owner is user1", todo3.user.id, user1.id);
  TestValidator.equals("description is null", todo3.description, null);

  // Scenario 4: Title at maximum length (100 chars)
  const title100 = RandomGenerator.alphaNumeric(100) as string &
    tags.MinLength<1> &
    tags.MaxLength<100>;
  const todo4 = await api.functional.todoList.user.todos.create(connection, {
    body: { title: title100 },
  });
  typia.assert(todo4);
  TestValidator.equals("max length title accepted", todo4.title, title100);

  // Scenario 5: Title only whitespace (should fail)
  await TestValidator.error("whitespace-only title is rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: { title: " ", description: "Some desc" },
    });
  });

  // Scenario 6: Title too long (101 chars)
  await TestValidator.error("title >100 chars rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: { title: RandomGenerator.alphaNumeric(101), description: "desc" },
    });
  });

  // Scenario 7: Description too long (1001 chars)
  await TestValidator.error("description >1000 chars rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.alphaNumeric(1001),
      },
    });
  });

  // Scenario 8: Missing title (required)
  await TestValidator.error("missing title rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {} as any, // for test coverage; actual e2e won't pass type check
    });
  });

  // Scenario 9: Duplicate title (same user)
  await TestValidator.error("duplicate title rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: { title: todoTitle },
    });
  });

  // Register second user
  const userEmail2 = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail2 as string &
        tags.MinLength<5> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(10) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      href: "https://app.todo-list.com/register",
      referrer: "https://app.todo-list.com/",
    },
  });
  typia.assert(user2);

  // Scenario 10: Same title allowed for other user
  const todoA = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle,
      description: "Allowed for second user",
    },
  });
  typia.assert(todoA);
  TestValidator.equals(
    "second user got todo with same title",
    todoA.title,
    todoTitle,
  );
  TestValidator.notEquals("todo users differ", todoA.user.id, user1.id);
}
