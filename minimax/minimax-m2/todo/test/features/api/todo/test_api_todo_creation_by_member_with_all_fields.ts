import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_creation_by_member_with_all_fields(
  connection: api.IConnection,
) {
  // 1. Register new member for authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // 2. Create comprehensive todo with all fields
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const todoCategory = RandomGenerator.pick([
    "work",
    "personal",
    "shopping",
    "health",
    "finance",
  ] as const);

  // Set future due date (7 days from now)
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
        business_status: "active",
        priority: "high",
        category: todoCategory,
        due_date: futureDate,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // 3. Validate todo creation and all fields
  TestValidator.equals("todo title matches", createdTodo.title, todoTitle);
  TestValidator.equals(
    "todo description matches",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals("todo status is pending", createdTodo.status, "pending");
  TestValidator.equals(
    "todo business status is active",
    createdTodo.business_status,
    "active",
  );
  TestValidator.equals("todo priority is high", createdTodo.priority, "high");
  TestValidator.equals(
    "todo category matches",
    createdTodo.category,
    todoCategory,
  );
  TestValidator.equals(
    "todo due date matches",
    createdTodo.due_date,
    futureDate,
  );

  // 4. Validate member association and ownership
  TestValidator.predicate(
    "todo belongs to authenticated member",
    member.id !== undefined && createdTodo.id !== undefined,
  );

  // 5. Validate timestamp assignment
  TestValidator.predicate(
    "todo has creation timestamp",
    createdTodo.created_at !== undefined && createdTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo has update timestamp",
    createdTodo.updated_at !== undefined && createdTodo.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdTodo.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdTodo.updated_at,
    ),
  );

  // 6. Validate completion timestamp is null for new todos
  TestValidator.equals(
    "completed_at is null for new todo",
    createdTodo.completed_at,
    null,
  );

  // 7. Validate soft deletion timestamp is null for active todos
  TestValidator.equals(
    "deleted_at is null for active todo",
    createdTodo.deleted_at,
    null,
  );
}
