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

export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
) {
  // 1. Create authenticated member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // 2. Test todo creation with High priority and minimal fields
  const highPriorityTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        priority: "High" as IETodoPriority,
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(highPriorityTodo);

  TestValidator.equals(
    "high priority todo member_id",
    highPriorityTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "high priority todo title",
    highPriorityTodo.title.length >= 1,
    true,
  );
  TestValidator.equals(
    "high priority todo priority",
    highPriorityTodo.priority,
    "High",
  );
  TestValidator.equals(
    "high priority todo completed",
    highPriorityTodo.completed,
    false,
  );

  // 3. Test todo creation with Medium priority (default behavior)
  const mediumPriorityTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(mediumPriorityTodo);

  TestValidator.equals(
    "medium priority todo member_id",
    mediumPriorityTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "medium priority todo priority",
    mediumPriorityTodo.priority,
    "Medium",
  );

  // 4. Test todo creation with Low priority and longer title
  const lowPriorityTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 6,
        }),
        priority: "Low" as IETodoPriority,
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(lowPriorityTodo);

  TestValidator.equals(
    "low priority todo member_id",
    lowPriorityTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "low priority todo priority",
    lowPriorityTodo.priority,
    "Low",
  );

  // 5. Test todo creation with edge case title lengths
  const singleCharTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: "A",
        priority: "Medium" as IETodoPriority,
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(singleCharTodo);

  TestValidator.equals("single character title", singleCharTodo.title, "A");
  TestValidator.equals(
    "single char todo priority",
    singleCharTodo.priority,
    "Medium",
  );

  // Test maximum length title (200 characters)
  const maxLengthTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 200,
    wordMax: 200,
  });

  const maxLengthTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: maxLengthTitle.substring(0, 200),
        priority: "High" as IETodoPriority,
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(maxLengthTodo);

  TestValidator.equals(
    "max length todo title length",
    maxLengthTodo.title.length,
    200,
  );
  await TestValidator.predicate(
    "max length todo timestamps valid",
    async () => {
      const createdAt = new Date(maxLengthTodo.created_at);
      const updatedAt = new Date(maxLengthTodo.updated_at);
      return (
        !isNaN(createdAt.getTime()) &&
        !isNaN(updatedAt.getTime()) &&
        createdAt <= updatedAt
      );
    },
  );

  // 6. Verify that priority field accepts null/undefined (based on DTO nullible types)
  const nullPriorityTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 9,
        }),
        priority: null,
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(nullPriorityTodo);

  TestValidator.predicate("null priority handled", () => true);

  // 7. Validate ID format compliance
  await TestValidator.predicate("all todo IDs are valid UUIDs", async () => {
    const todos = [
      highPriorityTodo,
      mediumPriorityTodo,
      lowPriorityTodo,
      singleCharTodo,
      maxLengthTodo,
      nullPriorityTodo,
    ];
    return todos.every((todo) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        todo.id,
      ),
    );
  });

  // 8. Validate member ID consistency across todos
  await TestValidator.predicate(
    "all todos belong to created member",
    async () => {
      const todos = [
        highPriorityTodo,
        mediumPriorityTodo,
        lowPriorityTodo,
        singleCharTodo,
        maxLengthTodo,
        nullPriorityTodo,
      ];
      return todos.every((todo) => todo.member_id === member.id);
    },
  );

  // 9. Validate schema compliance for timestamp formats
  await TestValidator.predicate(
    "all timestamps are ISO date-time format",
    async () => {
      const todos = [
        highPriorityTodo,
        mediumPriorityTodo,
        lowPriorityTodo,
        singleCharTodo,
        maxLengthTodo,
        nullPriorityTodo,
      ];
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      return todos.every(
        (todo) =>
          isoRegex.test(todo.created_at) &&
          isoRegex.test(todo.updated_at) &&
          (!todo.completed_at || isoRegex.test(todo.completed_at)),
      );
    },
  );
}
