import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test reverting a completed todo back to incomplete status.
 *
 * This test validates the complete todo status transition workflow, ensuring
 * that:
 *
 * 1. A user can mark a todo as complete (completed = true, completed_at is set)
 * 2. The user can then revert the todo to incomplete status (completed = false)
 * 3. When reverting to incomplete, the completed_at timestamp is automatically
 *    cleared to null
 * 4. Other todo fields remain unchanged during status transitions
 * 5. The updated_at timestamp is refreshed on each modification
 *
 * The test follows a realistic user workflow: creating a todo, marking it
 * complete, then changing their mind and reverting it back to incomplete
 * status.
 *
 * Step-by-step process:
 *
 * 1. Register a new user and authenticate
 * 2. Create a new todo item with initial data
 * 3. Mark the todo as complete and verify completed_at is recorded
 * 4. Mark the todo as incomplete and verify completed_at is cleared
 * 5. Verify all other fields remain unchanged and updated_at is refreshed
 */
export async function test_api_todo_update_mark_incomplete(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);
  TestValidator.predicate(
    "user registered successfully",
    registeredUser.id !== null && registeredUser.id !== undefined,
  );

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({ paragraphs: 1 });
  const todoPriority = RandomGenerator.pick(["low", "medium", "high"] as const);
  const futureDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: todoPriority,
        due_date: futureDueDate,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  TestValidator.predicate(
    "todo created with incomplete status",
    createdTodo.completed === false,
  );
  TestValidator.predicate(
    "todo created without completion timestamp",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );

  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  // Step 3: Mark the todo as complete
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure updated_at changes

  const markedComplete = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(markedComplete);
  TestValidator.predicate(
    "todo marked as complete",
    markedComplete.completed === true,
  );
  TestValidator.predicate(
    "completion timestamp is recorded",
    markedComplete.completed_at !== null &&
      markedComplete.completed_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at changes when marked complete",
    markedComplete.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    markedComplete.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "title unchanged after marking complete",
    markedComplete.title,
    todoTitle,
  );
  TestValidator.equals(
    "description unchanged after marking complete",
    markedComplete.description,
    todoDescription,
  );
  TestValidator.equals(
    "priority unchanged after marking complete",
    markedComplete.priority,
    todoPriority,
  );
  TestValidator.equals(
    "due_date unchanged after marking complete",
    markedComplete.due_date,
    futureDueDate,
  );

  const completedTimestamp = markedComplete.completed_at;
  const completeUpdatedAt = markedComplete.updated_at;

  // Step 4: Mark the todo back to incomplete (revert completion)
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure updated_at changes

  const markedIncomplete = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        completed: false,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(markedIncomplete);

  // Step 5: Verify the status reversion
  TestValidator.predicate(
    "todo marked back to incomplete",
    markedIncomplete.completed === false,
  );
  TestValidator.predicate(
    "completed_at is cleared when reverting to incomplete",
    markedIncomplete.completed_at === null ||
      markedIncomplete.completed_at === undefined,
  );
  TestValidator.notEquals(
    "updated_at changes when marked incomplete",
    markedIncomplete.updated_at,
    completeUpdatedAt,
  );
  TestValidator.equals(
    "created_at still unchanged",
    markedIncomplete.created_at,
    originalCreatedAt,
  );

  // Verify other fields remain unchanged through both transitions
  TestValidator.equals(
    "title unchanged after reverting to incomplete",
    markedIncomplete.title,
    todoTitle,
  );
  TestValidator.equals(
    "description unchanged after reverting to incomplete",
    markedIncomplete.description,
    todoDescription,
  );
  TestValidator.equals(
    "priority unchanged after reverting to incomplete",
    markedIncomplete.priority,
    todoPriority,
  );
  TestValidator.equals(
    "due_date unchanged after reverting to incomplete",
    markedIncomplete.due_date,
    futureDueDate,
  );
}
