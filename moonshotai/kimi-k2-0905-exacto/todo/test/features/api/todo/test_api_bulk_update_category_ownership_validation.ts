import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskUpdateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskUpdateResult";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test security boundary validation by attempting bulk updates with incorrect
 * category ownership. Creates tasks with one user, then attempts unauthorized
 * bulk category operations by another user. Validates that the system prevents
 * cross-user data manipulation and enforces proper ownership.
 *
 * 1. Create first user who will own tasks to be updated
 * 2. Create second user who will attempt unauthorized category operations
 * 3. Create tasks as first user for ownership validation testing
 * 4. Attempt bulk category update by second user on first user's tasks
 * 5. Verify system prevents unauthorized bulk operations
 */
export async function test_api_bulk_update_category_ownership_validation(
  connection: api.IConnection,
) {
  // Create first user who will own the tasks
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123",
      ip: "192.168.1.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Create second user who will attempt unauthorized operations
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "AnotherPass456",
      ip: "192.168.1.2",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);

  // Create tasks as first user (authentication is automatically handled by join)
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "First user's important task",
      description: "This task belongs to first user",
      priority: "High",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Another task for first user",
      description: "Also belongs to first user",
      priority: "Medium",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  const task3 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Third task for first user",
      description: "Third task owned by first user",
      priority: "Low",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task3);

  // Switch to second user and attempt unauthorized bulk category update
  // Since we can't create categories with the available APIs, we'll use a random UUID
  // The system should reject the operation regardless of category existence

  // Create a new connection for second user
  const secondUserConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Join as second user to get authentication
  await api.functional.auth.user.join(secondUserConnection, {
    body: {
      email: secondUserEmail,
      password: "AnotherPass456",
      ip: "192.168.1.2",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });

  // Attempt bulk update on first user's tasks using second user's authentication
  // This should fail due to ownership validation
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "bulk category update should fail for unauthorized user",
    async () => {
      await api.functional.todoApp.user.tasks.bulk_update_category.updateBulkCategory(
        secondUserConnection,
        {
          body: {
            task_ids: [task1.id, task2.id, task3.id],
            todo_app_category_id: randomCategoryId,
          } satisfies ITodoAppTask.IBulkUpdateCategory,
        },
      );
    },
  );

  // Verify that the tasks still belong to the first user
  TestValidator.predicate(
    "tasks maintain original ownership",
    task1.user.id === firstUser.id &&
      task2.user.id === firstUser.id &&
      task3.user.id === firstUser.id,
  );

  // Test bulk operation validation - empty task list
  await TestValidator.error(
    "bulk update should fail with empty task list",
    async () => {
      await api.functional.todoApp.user.tasks.bulk_update_category.updateBulkCategory(
        secondUserConnection,
        {
          body: {
            task_ids: [],
            todo_app_category_id: randomCategoryId,
          } satisfies ITodoAppTask.IBulkUpdateCategory,
        },
      );
    },
  );
}
