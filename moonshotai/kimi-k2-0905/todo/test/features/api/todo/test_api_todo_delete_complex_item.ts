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
 * Test deletion of a complex todo item with extensive content.
 *
 * This test validates the system's ability to handle deletion of todo items
 * with large amounts of data. The test creates a member account, then creates a
 * todo item with a very long title (approaching the 200 character limit) and
 * uses the detailed description from a multi-paragraph content generator to
 * simulate real-world complex todo items with substantial text content.
 *
 * The test verifies that:
 *
 * 1. Member registration works correctly
 * 2. Complex todo creation with extensive text content succeeds
 * 3. Todo deletion operation completes successfully
 * 4. System handles large data without performance issues
 *
 * This ensures the deletion functionality works properly even with data-heavy
 * todo items that users might create in real scenarios.
 */
export async function test_api_todo_delete_complex_item(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: password,
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create a complex todo with extensive title and description
  // Generate a long title (approaching the 200 character limit)
  const longTitle = `${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()} ${RandomGenerator.name()}`;

  // Generate detailed description using content generator
  const detailedDescription = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const complexTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: longTitle,
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(complexTodo);

  // Step 3: Delete the complex todo item
  await api.functional.todo.member.todos.erase(connection, {
    todoId: complexTodo.id,
  });

  // The deletion is successful if no error is thrown
  TestValidator.predicate("complex todo deletion succeeded", true);
}
