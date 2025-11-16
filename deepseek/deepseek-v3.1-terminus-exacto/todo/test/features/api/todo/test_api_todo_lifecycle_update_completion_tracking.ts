import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoLifecycle";
import type { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test completion tracking workflow for todo lifecycle management.
 *
 * This test validates the complete workflow of creating a todo item, updating
 * its lifecycle to mark it as completed with completion timestamp, and
 * verifying that the system properly records completion status while creating
 * appropriate snapshots for audit trail purposes.
 */
export async function test_api_todo_lifecycle_update_completion_tracking(
  connection: api.IConnection,
) {
  // 1. Create a new user account for authentication context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "password123",
        password_hash: typia.random<string>(),
        status: "active",
        created_at: typia.random<string & tags.Format<"date-time">>(),
        updated_at: typia.random<string & tags.Format<"date-time">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a todo item to track completion
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        due_date: typia.random<string & tags.Format<"date-time">>(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Update the todo lifecycle to mark it as completed
  const updatedLifecycle: ITodoAppTodoLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        status: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "completed",
          name: "Completed",
          is_active: true,
        } satisfies ITodoAppTodoStatus.ISummary,
        priority: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "medium",
          name: "Medium",
          description: "Medium priority task",
          weight: 50,
          is_active: true,
          created_at: typia.random<string & tags.Format<"date-time">>(),
        } satisfies ITodoAppTodoPriority.ISummary,
        current_snapshot: {
          id: typia.random<string & tags.Format<"uuid">>(),
          todo: {
            id: todo.id,
            user: {
              id: user.id,
              email: user.email,
              status: user.status,
              created_at: user.created_at,
            } satisfies ITodoAppUser.ISummary,
            session: {
              id: typia.random<string & tags.Format<"uuid">>(),
              ip: "127.0.0.1",
              href: "http://localhost:3000",
              referrer: "http://localhost:3000",
              created_at: typia.random<string & tags.Format<"date-time">>(),
              expired_at: typia.random<string & tags.Format<"date-time">>(),
            } satisfies ITodoAppUserSession.ISummary,
            title: todo.title,
            description: todo.description,
            due_date: todo.due_date,
            created_at: todo.created_at,
            updated_at: todo.updated_at,
            deleted_at: todo.deleted_at,
          } satisfies ITodoAppTodo.ISummary,
          status: {
            id: typia.random<string & tags.Format<"uuid">>(),
            code: "completed",
            name: "Completed",
            is_active: true,
          } satisfies ITodoAppTodoStatus.ISummary,
          priority: {
            id: typia.random<string & tags.Format<"uuid">>(),
            code: "medium",
            name: "Medium",
            description: "Medium priority task",
            weight: 50,
            is_active: true,
            created_at: typia.random<string & tags.Format<"date-time">>(),
          } satisfies ITodoAppTodoPriority.ISummary,
          completed_at: typia.random<string & tags.Format<"date-time">>(),
          snapshot_created_at: typia.random<
            string & tags.Format<"date-time">
          >(),
        } satisfies ITodoAppTodoSnapshot,
        updated_at: typia.random<string & tags.Format<"date-time">>(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(updatedLifecycle);

  // 4. Validate that completion status is properly recorded
  TestValidator.equals(
    "todo lifecycle should be updated",
    updatedLifecycle.todo_app_todo_id,
    todo.id,
  );

  // 5. Verify that the system creates appropriate snapshots for audit trail
  TestValidator.predicate(
    "current snapshot should exist",
    updatedLifecycle.current_snapshot !== undefined,
  );

  if (updatedLifecycle.current_snapshot) {
    TestValidator.equals(
      "snapshot should reference the correct todo",
      updatedLifecycle.current_snapshot.todo.id,
      todo.id,
    );

    TestValidator.predicate(
      "completed_at timestamp should be set",
      updatedLifecycle.current_snapshot.completed_at !== undefined &&
        updatedLifecycle.current_snapshot.completed_at !== null,
    );

    TestValidator.equals(
      "status should be marked as completed",
      updatedLifecycle.current_snapshot.status.code,
      "completed",
    );
  }
}
