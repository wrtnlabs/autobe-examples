import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test comprehensive todo item update functionality by authenticated member
 * user. The test validates the complete todo update workflow including
 * authentication, todo creation, and multiple field updates with proper
 * validation of timestamp management and automatic completed_at field handling.
 * This E2E test ensures that authenticated members can successfully update
 * their personal todo items with various field changes including title,
 * description, status transitions (pending → in_progress → completed), priority
 * levels, categories, and due dates while maintaining data integrity and proper
 * timestamp handling.
 */
export async function test_api_todo_update_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // 2. Create initial todo item with title, description, and priority
  const initialTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
        status: "pending",
        business_status: "active",
        priority: "medium",
        category: "work",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial todo created with correct status",
    initialTodo.status,
    "pending",
  );
  TestValidator.equals(
    "initial todo created with correct priority",
    initialTodo.priority,
    "medium",
  );
  TestValidator.equals(
    "initial todo has no completed_at",
    initialTodo.completed_at,
    null,
  );

  // 3. Update title and description
  const updatedTodo1: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo1);
  TestValidator.equals(
    "todo title updated successfully",
    updatedTodo1.title !== initialTodo.title,
    true,
  );
  TestValidator.equals(
    "todo description updated successfully",
    updatedTodo1.description !== initialTodo.description,
    true,
  );
  TestValidator.equals(
    "status unchanged from update",
    updatedTodo1.status,
    "pending",
  );
  TestValidator.equals(
    "completed_at still null",
    updatedTodo1.completed_at,
    null,
  );

  // 4. Update priority level and category
  const updatedTodo2: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: updatedTodo1.id,
      body: {
        priority: "high",
        category: "urgent",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo2);
  TestValidator.equals(
    "priority updated to high",
    updatedTodo2.priority,
    "high",
  );
  TestValidator.equals(
    "category updated to urgent",
    updatedTodo2.category,
    "urgent",
  );
  TestValidator.equals(
    "title preserved from previous update",
    updatedTodo2.title,
    updatedTodo1.title,
  );
  TestValidator.equals("status still pending", updatedTodo2.status, "pending");

  // 5. Update status from pending to in_progress
  const updatedTodo3: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: updatedTodo2.id,
      body: {
        status: "in_progress",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo3);
  TestValidator.equals(
    "status updated to in_progress",
    updatedTodo3.status,
    "in_progress",
  );
  TestValidator.equals(
    "completed_at still null after in_progress",
    updatedTodo3.completed_at,
    null,
  );
  TestValidator.equals(
    "updated_at timestamp changed",
    updatedTodo3.updated_at !== updatedTodo2.updated_at,
    true,
  );

  // 6. Update due date and complete the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: updatedTodo3.id,
      body: {
        status: "completed",
        due_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(completedTodo);
  TestValidator.equals(
    "status updated to completed",
    completedTodo.status,
    "completed",
  );
  TestValidator.equals(
    "completed_at automatically set when status is completed",
    completedTodo.completed_at !== null,
    true,
  );
  TestValidator.equals(
    "completed_at is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      completedTodo.completed_at!,
    ),
    true,
  );

  // 7. Verify final state validation
  TestValidator.equals(
    "final todo ID preserved",
    completedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "all updates accumulated correctly",
    completedTodo.priority === "high" && completedTodo.category === "urgent",
    true,
  );
  TestValidator.equals(
    "business status remained active",
    completedTodo.business_status,
    "active",
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    completedTodo.created_at,
    initialTodo.created_at,
  );
  TestValidator.equals(
    "final updated_at is later than previous",
    completedTodo.updated_at > updatedTodo3.updated_at,
    true,
  );
}
