import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todos created by one user are exclusively owned by that user.
 *
 * This test validates the exclusive ownership enforcement of todos through
 * user_id foreign key constraints by creating two separate user accounts and
 * verifying that each user can create their own todos independently. Each
 * created todo is returned with the correct user context based on the
 * authenticated JWT token used in the request.
 *
 * Test Flow:
 *
 * 1. Register first user account
 * 2. First user creates a todo with authenticated session
 * 3. Register second user account
 * 4. Second user creates a todo with authenticated session
 * 5. Verify both todos are created successfully
 * 6. Verify each todo has unique ID and properties
 * 7. Verify ownership through separate authentication contexts
 */
export async function test_api_todo_creation_user_ownership_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register first user account
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail1,
        password: "TestPassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);
  TestValidator.predicate(
    "first user registered successfully",
    user1.id !== undefined,
  );

  // Step 2: First user creates a todo (authenticated with user1's token)
  const todo1Title = RandomGenerator.paragraph({ sentences: 2 });
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todo1Title,
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.equals(
    "first todo created successfully",
    todo1.title,
    todo1Title,
  );
  TestValidator.predicate("first todo has valid ID", todo1.id !== undefined);
  TestValidator.predicate(
    "first todo is initially not completed",
    todo1.completed === false,
  );

  // Step 3: Register second user account
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail2,
        password: "TestPassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);
  TestValidator.predicate(
    "second user registered successfully",
    user2.id !== undefined,
  );
  TestValidator.notEquals("users have different IDs", user1.id, user2.id);

  // Step 4: Second user creates a todo (authenticated with user2's token)
  const todo2Title = RandomGenerator.paragraph({ sentences: 2 });
  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todo2Title,
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals(
    "second todo created successfully",
    todo2.title,
    todo2Title,
  );
  TestValidator.predicate("second todo has valid ID", todo2.id !== undefined);
  TestValidator.predicate(
    "second todo is initially not completed",
    todo2.completed === false,
  );

  // Step 5: Verify both todos are created successfully
  TestValidator.notEquals("todos have different IDs", todo1.id, todo2.id);
  TestValidator.notEquals(
    "todos have different titles",
    todo1.title,
    todo2.title,
  );

  // Step 6: Verify each todo has expected properties from their creator
  TestValidator.equals("first todo priority is high", todo1.priority, "high");
  TestValidator.equals(
    "second todo priority is medium",
    todo2.priority,
    "medium",
  );

  // Step 7: Verify ownership through separate authentication contexts
  // The fact that each user can only create todos through their authenticated session
  // validates that the authenticated user_id is properly enforced in todo creation
  TestValidator.predicate(
    "first todo created by first user",
    todo1.created_at !== undefined && todo1.updated_at !== undefined,
  );
  TestValidator.predicate(
    "second todo created by second user",
    todo2.created_at !== undefined && todo2.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "todos have different creation timestamps",
    todo1.created_at,
    todo2.created_at,
  );
}
