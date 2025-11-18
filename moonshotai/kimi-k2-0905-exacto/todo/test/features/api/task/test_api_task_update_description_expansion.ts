import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test expanding task description to provide additional context.
 *
 * This test validates that users can enrich task information with detailed
 * explanations while respecting the 1000-character limit. The test verifies
 * description updates work correctly and maintains data integrity.
 *
 * 1. Create a new user account for testing
 * 2. Create a task with basic description
 * 3. Update the task with expanded description
 * 4. Verify the description was updated correctly
 * 5. Test the 1000-character limit boundary
 */
export async function test_api_task_update_description_expansion(
  connection: api.IConnection,
) {
  // Create user account
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create initial task with basic description
  const initialTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write basic documentation",
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(initialTask);

  // Test 1: Expand description with detailed explanation
  const expandedDescription =
    "This task involves creating comprehensive documentation for the project. The documentation should include: 1) API reference with all endpoints and parameters, 2) User guide with step-by-step instructions, 3) Architecture overview explaining system design, 4) Deployment guide for production setup, 5) Troubleshooting section for common issues. The goal is to ensure developers can easily understand and contribute to the project.";

  const updatedTask1 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        description: expandedDescription,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);

  // Verify description was expanded
  TestValidator.equals(
    "expanded description",
    updatedTask1.description,
    expandedDescription,
  );
  TestValidator.notEquals(
    "timestamp updated",
    updatedTask1.updated_at,
    initialTask.updated_at,
  );

  // Test 2: Verify 1000-character limit (create a 1000-character description)
  const maxCharDescription = ArrayUtil.repeat(100, () => "1234567890").join("");
  TestValidator.equals(
    "description is 1000 characters",
    maxCharDescription.length,
    1000,
  );

  const updatedTask2 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        description: maxCharDescription,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);

  TestValidator.equals(
    "max character description",
    updatedTask2.description,
    maxCharDescription,
  );

  // Test 3: Update with null description (remove description)
  const updatedTask3 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        description: null,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask3);

  TestValidator.equals("description removed", updatedTask3.description, null);

  // Test 4: Update only description, other fields unchanged
  const titleOnlyTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Another task",
        status: "pending",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(titleOnlyTask);

  const descriptionOnlyUpdate = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: titleOnlyTask.id,
      body: {
        description: "Added detailed explanation after creation",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(descriptionOnlyUpdate);

  // Verify only description was added, other fields remain unchanged
  TestValidator.equals(
    "title unchanged",
    descriptionOnlyUpdate.title,
    titleOnlyTask.title,
  );
  TestValidator.equals(
    "status unchanged",
    descriptionOnlyUpdate.status,
    titleOnlyTask.status,
  );
  TestValidator.equals(
    "priority unchanged",
    descriptionOnlyUpdate.priority,
    titleOnlyTask.priority,
  );
  TestValidator.equals(
    "description added",
    descriptionOnlyUpdate.description,
    "Added detailed explanation after creation",
  );
}
