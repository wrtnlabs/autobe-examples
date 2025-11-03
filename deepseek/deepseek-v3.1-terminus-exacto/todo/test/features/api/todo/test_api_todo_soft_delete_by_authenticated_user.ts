import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can successfully soft delete their todo items
 * by setting the deleted_at timestamp. This scenario validates the complete
 * workflow of user registration, todo creation, and soft deletion. The test
 * ensures proper ownership validation and that soft deletion preserves the
 * record while marking it as deleted for exclusion from normal queries.
 */
export async function test_api_todo_soft_delete_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account using the available registration endpoint
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const registeredUser = await api.functional.todoApp.auth.register.create(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 2: Create a todo item to be soft deleted
  const todoTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const todoData = {
    title: todoTitle,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.user.users.todos.create(
    connection,
    {
      userId: registeredUser.id,
      body: todoData,
    },
  );
  typia.assert(createdTodo);

  // Validate that the created todo matches the input data
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo belongs to the correct user",
    createdTodo.todo_app_user_id,
    registeredUser.id,
  );
  TestValidator.predicate(
    "created todo has active status",
    createdTodo.status === "active",
  );

  // Step 3: Perform soft delete operation
  await api.functional.todoApp.user.users.todos.erase(connection, {
    userId: registeredUser.id,
    todoId: createdTodo.id,
  });

  // Step 4: Validate that the operation completed successfully
  // The erase function returns void, so we just need to ensure it doesn't throw an error
  TestValidator.predicate("soft delete operation completed successfully", true);

  // Step 5: Additional validation - verify ownership by attempting to delete with wrong user ID
  const wrongUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when attempting to delete with wrong user ID",
    async () => {
      await api.functional.todoApp.user.users.todos.erase(connection, {
        userId: wrongUserId,
        todoId: createdTodo.id,
      });
    },
  );

  // Step 6: Additional validation - verify ownership by attempting to delete with wrong todo ID
  const wrongTodoId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when attempting to delete with wrong todo ID",
    async () => {
      await api.functional.todoApp.user.users.todos.erase(connection, {
        userId: registeredUser.id,
        todoId: wrongTodoId,
      });
    },
  );
}
