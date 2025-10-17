import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

/**
 * Test updating priority level through all available options (Low, Medium,
 * High) to ensure proper enum validation. Validates that each priority
 * transition works correctly and returns the updated priority in the response.
 *
 * @param connection The API connection object
 */
export async function test_api_todo_priority_level_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member user to obtain authentication
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password: "password123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create a new todo item with default priority (Medium)
  const todoCreate = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "Test todo item",
      priority: "Medium",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(todoCreate);

  TestValidator.equals(
    "initial priority should be Medium",
    todoCreate.priority,
    "Medium",
  );

  // Step 3: Update priority from Medium to Low
  const todoLow = await api.functional.todo.member.todos.update(connection, {
    todoId: todoCreate.id,
    body: {
      priority: "Low",
    } satisfies ITodoTodo.ITodoUpdate,
  });
  typia.assert(todoLow);

  TestValidator.equals(
    "priority should be updated to Low",
    todoLow.priority,
    "Low",
  );

  // Step 4: Update priority from Low to Medium
  const todoMedium = await api.functional.todo.member.todos.update(connection, {
    todoId: todoLow.id,
    body: {
      priority: "Medium",
    } satisfies ITodoTodo.ITodoUpdate,
  });
  typia.assert(todoMedium);

  TestValidator.equals(
    "priority should be updated to Medium",
    todoMedium.priority,
    "Medium",
  );

  // Step 5: Update priority from Medium to High
  const todoHigh = await api.functional.todo.member.todos.update(connection, {
    todoId: todoMedium.id,
    body: {
      priority: "High",
    } satisfies ITodoTodo.ITodoUpdate,
  });
  typia.assert(todoHigh);

  TestValidator.equals(
    "priority should be updated to High",
    todoHigh.priority,
    "High",
  );

  // Step 6: Update priority back to Low to test reverse transition
  const todoLowAgain = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: todoHigh.id,
      body: {
        priority: "Low",
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(todoLowAgain);

  TestValidator.equals(
    "priority should be updated back to Low",
    todoLowAgain.priority,
    "Low",
  );
}
