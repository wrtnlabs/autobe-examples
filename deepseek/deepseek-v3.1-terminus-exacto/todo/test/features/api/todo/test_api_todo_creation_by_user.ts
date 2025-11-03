import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete todo creation workflow where a newly registered user creates
 * their first todo item. Validates that users can successfully create todo
 * items with proper titles, that the todo is correctly associated with the
 * authenticated user, and that all system-generated fields (ID, timestamps,
 * status) are properly set. Validates business rules including title length
 * constraints and automatic status assignment to 'active' upon creation.
 */
export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(authorizedUser);

  // Step 2: Create a todo item for the authenticated user
  const todoTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const createdTodo = await api.functional.todoApp.user.users.todos.create(
    connection,
    {
      userId: authorizedUser.id,
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Validate the todo creation response
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo is associated with correct user",
    createdTodo.todo_app_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "todo status is automatically set to active",
    createdTodo.status,
    "active" as ITodoAppTodoStatus,
  );
  TestValidator.predicate(
    "todo title meets length constraints",
    createdTodo.title.length >= 1 && createdTodo.title.length <= 255,
  );

  // Step 4: Validate user summary in todo response
  TestValidator.equals(
    "user summary ID matches authenticated user",
    createdTodo.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "user summary email matches authenticated user",
    createdTodo.user.email,
    authorizedUser.email,
  );

  // Step 5: Test error scenario - creating todo with empty title
  await TestValidator.error("empty title should fail", async () => {
    await api.functional.todoApp.user.users.todos.create(connection, {
      userId: authorizedUser.id,
      body: {
        title: "",
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  // Step 6: Test error scenario - creating todo for different user (should fail)
  const differentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "creating todo for different user should fail",
    async () => {
      await api.functional.todoApp.user.users.todos.create(connection, {
        userId: differentUserId,
        body: {
          title: "Test todo",
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );
}
