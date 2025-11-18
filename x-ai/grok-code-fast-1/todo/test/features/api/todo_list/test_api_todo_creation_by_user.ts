import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an authenticated user can create a todo item, all business
 * rules for the title, description, and system fields are enforced, and
 * failures occur for invalid data or on missing authentication.
 *
 * 1. Register a user (join)
 * 2. Create a valid todo (title + description)
 * 3. Check required fields (ownership, status, timestamps)
 * 4. Create with duplicate title (should fail)
 * 5. Try to create a todo as unauthenticated user (should fail)
 */
export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register & authenticate a new user (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "1A";
  const displayName = RandomGenerator.name();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password: password satisfies string as string,
        display_name: displayName,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
        ip: undefined,
      },
    },
  );
  typia.assert(user);
  TestValidator.equals("registered user email", user.email, email);
  TestValidator.equals(
    "registered user display name",
    user.display_name,
    displayName,
  );

  // 2. Create a valid todo item
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 5,
  });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 5,
  });
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: { title, description } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title", todo.title, title);
  TestValidator.equals("todo description", todo.description, description);
  TestValidator.equals("todo status is pending", todo.status, "pending");
  TestValidator.predicate(
    "todo has id",
    typeof todo.id === "string" && todo.id.length > 20,
  );
  TestValidator.predicate(
    "todo has created_at",
    typeof todo.created_at === "string" && !!todo.created_at,
  );
  TestValidator.predicate(
    "todo has updated_at",
    typeof todo.updated_at === "string" && !!todo.updated_at,
  );
  TestValidator.equals("todo completed_at null", todo.completed_at, null);
  TestValidator.equals("todo deleted_at null", todo.deleted_at, null);

  // 3. Attempt to create a todo with duplicate title (should fail)
  await TestValidator.error("duplicate todo title must fail", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: { title, description: null } satisfies ITodoListTodo.ICreate,
    });
  });

  // 4. Unauthenticated: try to create todo with a fresh connection (no auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated todo creation must fail",
    async () => {
      await api.functional.todoList.user.todos.create(unauthConn, {
        body: {
          title: RandomGenerator.name(),
          description: null,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
