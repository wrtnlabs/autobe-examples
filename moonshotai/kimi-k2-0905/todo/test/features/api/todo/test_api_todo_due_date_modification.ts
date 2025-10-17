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
 * Test updating due date from past to future date to validate date format
 * requirements and due date constraints. Ensures the API properly handles date
 * formatting and validation. The test workflow includes: 1) Register a new
 * member account to authenticate todo operations, 2) Create a todo item with an
 * initial due date to establish a baseline, 3) Update the todo with a new
 * future due date to validate date modification capability, 4) Verify the
 * updated todo reflects the due date change correctly.
 */
export async function test_api_todo_due_date_modification(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create a todo item with a past due date
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const originalTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(originalTodo);

  // Step 3: Update the todo with a future due date
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  const updatedTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        completed: false,
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Verify the updated todo reflects the changes correctly
  TestValidator.equals("todo id unchanged", updatedTodo.id, originalTodo.id);
  TestValidator.equals(
    "todo member_id unchanged",
    updatedTodo.member_id,
    originalTodo.member_id,
  );
  TestValidator.notEquals(
    "todo title updated",
    updatedTodo.title,
    originalTodo.title,
  );
  TestValidator.predicate(
    "todo completion status is false",
    updatedTodo.completed === false,
  );
  TestValidator.predicate(
    "todo updated_at is newer than created_at",
    new Date(updatedTodo.updated_at).getTime() >
      new Date(originalTodo.created_at).getTime(),
  );
}
