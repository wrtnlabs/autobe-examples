import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo item's completion status from 'complete' to
 * 'incomplete'.
 *
 * This test validates the ability to change a todo's status bidirectionally,
 * specifically testing the workflow where a completed task needs to be
 * reopened. This supports scenarios where tasks are marked complete prematurely
 * or require additional work after being completed.
 *
 * Workflow:
 *
 * 1. Register new user account
 * 2. Create a new todo item
 * 3. Mark the todo as 'complete'
 * 4. Change the status back to 'incomplete'
 * 5. Verify status change, updated_at modification, and property preservation
 */
export async function test_api_todo_update_status_complete_to_incomplete(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.IRegister,
    });
  typia.assert(registeredUser);

  // Step 2: Create a new todo item (starts as 'incomplete' by default)
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Validate initial creation
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo description matches",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "created todo status is incomplete",
    createdTodo.status,
    "incomplete",
  );

  // Step 3: Update the todo to mark it as 'complete'
  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        status: "complete",
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo);

  // Validate completion
  TestValidator.equals(
    "todo status is now complete",
    completedTodo.status,
    "complete",
  );
  TestValidator.equals(
    "todo title unchanged after completion",
    completedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description unchanged after completion",
    completedTodo.description,
    todoDescription,
  );

  // Store the updated_at timestamp after marking complete
  const completedTimestamp = completedTodo.updated_at;

  // Step 4: Update the todo to change status from 'complete' back to 'incomplete'
  const reopenedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        status: "incomplete",
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(reopenedTodo);

  // Step 5: Verify the status change from complete to incomplete
  TestValidator.equals(
    "todo status changed back to incomplete",
    reopenedTodo.status,
    "incomplete",
  );

  // Step 6: Verify that updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at changed after status modification",
    reopenedTodo.updated_at,
    completedTimestamp,
  );

  // Step 7: Confirm all other properties remained unchanged
  TestValidator.equals(
    "todo id remained unchanged",
    reopenedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title remained unchanged",
    reopenedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description remained unchanged",
    reopenedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo user ownership unchanged",
    reopenedTodo.todo_list_user_id,
    createdTodo.todo_list_user_id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    reopenedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    reopenedTodo.deleted_at,
    createdTodo.deleted_at,
  );
}
