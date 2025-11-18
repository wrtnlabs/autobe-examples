import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_retrieval_authorization(
  connection: api.IConnection,
) {
  // 1. Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123",
      ip: "127.0.0.1",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // 2. Create second user account
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "SecurePass456",
      ip: "127.0.0.1",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser); // Just to prevent unused variable warning

  // 3. First user creates a task
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.paragraph({ sentences: 5 });
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
      description: taskDescription,
      priority: "High",
      due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      completion_order: 1,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // 4. First user creates a category
  const categoryName = RandomGenerator.name();
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Test unauthorized access with second user (switching connection context by re-authenticating)
  // 5. Switch to second user context
  await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "SecurePass456",
      ip: "127.0.0.1",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });

  // 6. Verify unauthorized user cannot access the first user's task
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.todoApp.user.tasks.at(connection, {
      taskId: task.id,
    });
  });

  // 7. Switch back to first user context
  await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123",
      ip: "127.0.0.1",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });

  // 8. Verify authorized access works
  const authorizedResponse = await api.functional.todoApp.user.tasks.at(
    connection,
    {
      taskId: task.id,
    },
  );
  typia.assert(authorizedResponse);

  TestValidator.equals("task ID matches", authorizedResponse.id, task.id);
  TestValidator.equals(
    "task title matches",
    authorizedResponse.title,
    task.title,
  );
  TestValidator.equals(
    "task user ID matches",
    authorizedResponse.user.id,
    firstUser.id,
  );
  TestValidator.equals(
    "task status matches",
    authorizedResponse.status,
    "pending",
  );
  TestValidator.equals(
    "task priority matches",
    authorizedResponse.priority,
    "High",
  );

  // 9. Create task for second user to test isolated access
  const secondUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "Medium",
        completion_order: 2,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(secondUserTask);

  // 10. Verify first user cannot access second user's task (re-authenticate as first user)
  await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123",
      ip: "127.0.0.1",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });

  await TestValidator.error("cross user task access should fail", async () => {
    await api.functional.todoApp.user.tasks.at(connection, {
      taskId: secondUserTask.id,
    });
  });
}
