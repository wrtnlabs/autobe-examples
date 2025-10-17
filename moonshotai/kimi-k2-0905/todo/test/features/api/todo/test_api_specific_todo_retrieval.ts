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
 * Test successful retrieval of a specific todo by its ID.
 *
 * This test validates that authenticated members can retrieve complete details
 * of their own todo items including all properties like title, completion
 * status, priority, and timestamps. It ensures members can only access their
 * own todos and proper error responses are returned when attempting to access
 * todos owned by other members.
 *
 * Test workflow:
 *
 * 1. Register a new member account
 * 2. Create a todo item with specific properties
 * 3. Retrieve the todo by its ID
 * 4. Validate all todo properties match the created data
 * 5. Test access control by attempting to access non-existent todos
 */
export async function test_api_specific_todo_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Create a todo item with specific properties
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoPriority = RandomGenerator.pick(["Low", "Medium", "High"] as const);

  const createdTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        priority: todoPriority,
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(createdTodo);

  // Retrieve the todo by its ID
  const retrievedTodo = await api.functional.todo.member.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // Validate all properties match the created todo
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("member ID matches", retrievedTodo.member_id, member.id);
  TestValidator.equals("title matches", retrievedTodo.title, createdTodo.title);
  TestValidator.equals(
    "completed status matches",
    retrievedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "priority matches",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "completed_at matches",
    retrievedTodo.completed_at,
    createdTodo.completed_at,
  );

  // Test error case: retrieve non-existent todo ID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail to retrieve non-existent todo",
    async () => {
      await api.functional.todo.member.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
