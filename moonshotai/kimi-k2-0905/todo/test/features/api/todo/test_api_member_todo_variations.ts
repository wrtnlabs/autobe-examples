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
 * Tests todo creation with various input scenarios including minimal required
 * fields and different priority levels.
 *
 * This test validates the todo creation system by testing:
 *
 * 1. Creating todos with minimal required fields (title only)
 * 2. Creating todos with full property sets (title and priority)
 * 3. Validating different priority levels are handled correctly
 * 4. Ensuring successful API operations for valid inputs
 *
 * The test focuses on successful todo creation scenarios while avoiding
 * framework validation error testing.
 */
export async function test_api_member_todo_variations(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user for testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Test minimal todo creation with title only
  const minimalTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(minimalTodo);

  // Validate minimal todo properties
  TestValidator.equals(
    "minimal todo title not empty",
    minimalTodo.title.length > 0,
    true,
  );
  TestValidator.equals(
    "minimal todo priority defaults to Medium",
    minimalTodo.priority,
    "Medium",
  );
  TestValidator.equals(
    "minimal todo completed is false",
    minimalTodo.completed,
    false,
  );
  typia.assert(minimalTodo);
  typia.assert(minimalTodo);

  // Ensure completed_at is null for new incomplete todo
  TestValidator.equals(
    "minimal todo completed_at is null",
    minimalTodo.completed_at,
    null,
  );

  // Step 3: Test full todo creation with both title and priority
  const priorities: IETodoPriority = RandomGenerator.pick([
    "Low",
    "Medium",
    "High",
  ] as const);
  const fullTodo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 10,
      }),
      priority: priorities,
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(fullTodo);

  // Validate full todo properties
  TestValidator.equals(
    "full todo title not empty",
    fullTodo.title.length > 0,
    true,
  );
  TestValidator.equals(
    "full todo priority matches requested",
    fullTodo.priority,
    priorities,
  );
  TestValidator.equals(
    "full todo completed is false",
    fullTodo.completed,
    false,
  );
  typia.assert(fullTodo);
  typia.assert(fullTodo);

  // Step 4: Create todos with different priority levels to ensure all are handled correctly
  const highPriorityTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        priority: "High",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(highPriorityTodo);
  TestValidator.equals(
    "High priority todo has correct priority",
    highPriorityTodo.priority,
    "High",
  );

  const lowPriorityTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        priority: "Low",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(lowPriorityTodo);
  TestValidator.equals(
    "Low priority todo has correct priority",
    lowPriorityTodo.priority,
    "Low",
  );

  // Step 5: Verify member ownership consistency
  TestValidator.equals(
    "All todos belong to the member",
    minimalTodo.member_id === member.id &&
      fullTodo.member_id === member.id &&
      highPriorityTodo.member_id === member.id &&
      lowPriorityTodo.member_id === member.id,
    true,
  );

  // Step 6: Validate title length constraints
  const titleLengthTest = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 190,
          wordMax: 200,
        }),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(titleLengthTest);
  TestValidator.predicate(
    "title respects maximum length",
    titleLengthTest.title.length <= 200,
  );

  // Step 7: Test boundary title length
  const shortTitleTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 1,
          wordMax: 2,
        }),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(shortTitleTodo);
  TestValidator.predicate(
    "short title is valid",
    shortTitleTodo.title.length >= 1,
  );

  // Final validation: Confirm all todos have unique IDs
  const allIds = [
    minimalTodo.id,
    fullTodo.id,
    highPriorityTodo.id,
    lowPriorityTodo.id,
    titleLengthTest.id,
    shortTitleTodo.id,
  ];
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "all todo IDs are unique",
    uniqueIds.size,
    allIds.length,
  );
}
