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

export async function test_api_todo_completion_status_toggling(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password: "ValidPass123!",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create an incomplete todo item
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
  } satisfies ITodoTodo.ITodoCreate;

  const originalTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: todoCreateData,
    },
  );
  typia.assert(originalTodo);

  // Verify initial state
  TestValidator.equals(
    "todo initial completion status",
    originalTodo.completed,
    false,
  );
  TestValidator.equals(
    "todo initial completed_at",
    originalTodo.completed_at,
    null,
  );

  // Step 3: Mark todo as complete
  const completedTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {
        completed: true,
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(completedTodo);

  // Verify completion status change
  TestValidator.equals(
    "todo completion status after marking complete",
    completedTodo.completed,
    true,
  );
  TestValidator.predicate(
    "todo has completion timestamp",
    completedTodo.completed_at !== null,
  );
  TestValidator.notEquals(
    "todo completed_at is set",
    completedTodo.completed_at,
    null,
  );

  // Verify other properties remain unchanged
  TestValidator.equals(
    "todo title unchanged",
    completedTodo.title,
    originalTodo.title,
  );
  TestValidator.equals(
    "todo priority unchanged",
    completedTodo.priority,
    originalTodo.priority,
  );
  TestValidator.equals(
    "todo member_id unchanged",
    completedTodo.member_id,
    originalTodo.member_id,
  );

  // Step 4: Revert todo back to incomplete
  const revertedTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: completedTodo.id,
      body: {
        completed: false,
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(revertedTodo);

  // Verify reversion
  TestValidator.equals(
    "todo completion status after reverting",
    revertedTodo.completed,
    false,
  );
  TestValidator.equals(
    "todo completed_at cleared after reverting",
    revertedTodo.completed_at,
    null,
  );

  // Verify all other properties remain consistent
  TestValidator.equals(
    "todo title consistent",
    revertedTodo.title,
    completedTodo.title,
  );
  TestValidator.equals(
    "todo priority consistent",
    revertedTodo.priority,
    completedTodo.priority,
  );
  TestValidator.equals(
    "todo member_id consistent",
    revertedTodo.member_id,
    completedTodo.member_id,
  );
  TestValidator.equals(
    "todo created_at consistent",
    revertedTodo.created_at,
    completedTodo.created_at,
  );
  TestValidator.notEquals(
    "todo updated_at changed",
    revertedTodo.updated_at,
    completedTodo.updated_at,
  );
}
