import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation through the user-scoped POST
 * /todoApp/user/users/{userId}/tasks endpoint.
 *
 * Validates complete task creation workflow including title validation up to
 * 200 characters, optional description support up to 1000 characters, priority
 * level assignment (none, low, medium, high), status management
 * (pending/completed), and optional due date configuration. Ensures created
 * tasks are properly associated with the authenticated user and include
 * server-generated metadata like timestamps and unique identifiers.
 *
 * Test flow:
 *
 * 1. Create user account with email/password authentication
 * 2. Create multiple task configurations to test different scenarios
 * 3. Validate response structure, user association, and server-generated metadata
 */
export async function test_api_user_scoped_task_creation(
  connection: api.IConnection,
) {
  // Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(registeredUser);

  // Test 1: Create basic task with minimal required fields
  const basicTaskBody = {
    title: "Complete project documentation",
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const basicTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: basicTaskBody,
    },
  );
  typia.assert(basicTask);

  // Validate basic task creation
  TestValidator.equals(
    "basic task user ID matches",
    basicTask.user.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "basic task title matches",
    basicTask.title,
    basicTaskBody.title,
  );
  TestValidator.equals(
    "basic task status matches",
    basicTask.status,
    basicTaskBody.status,
  );

  // Test 2: Create task with description
  const describedTaskBody = {
    title: "Review code changes in PR #123",
    description:
      "Focus on authentication logic and error handling. Ensure proper error propagation to the frontend.",
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const describedTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: describedTaskBody,
    },
  );
  typia.assert(describedTask);

  TestValidator.equals(
    "described task title matches",
    describedTask.title,
    describedTaskBody.title,
  );
  TestValidator.equals(
    "described task description matches",
    describedTask.description,
    describedTaskBody.description,
  );
  TestValidator.equals(
    "described task status matches",
    describedTask.status,
    describedTaskBody.status,
  );

  // Test 3: Create task with priority level
  const priorityTaskBody = {
    title: "Fix security vulnerability in API endpoint",
    priority: "high",
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const priorityTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: priorityTaskBody,
    },
  );
  typia.assert(priorityTask);

  TestValidator.equals(
    "priority task title matches",
    priorityTask.title,
    priorityTaskBody.title,
  );
  TestValidator.equals(
    "priority task priority matches",
    priorityTask.priority,
    priorityTaskBody.priority,
  );

  // Test 4: Create task with due date
  const dueDateTaskBody = {
    title: "Submit quarterly report",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // One week from now
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const dueDateTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: dueDateTaskBody,
    },
  );
  typia.assert(dueDateTask);

  TestValidator.equals(
    "due date task title matches",
    dueDateTask.title,
    dueDateTaskBody.title,
  );
  TestValidator.equals(
    "due date task due_date matches",
    dueDateTask.due_date,
    dueDateTaskBody.due_date,
  );

  // Test 5: Create completed task
  const completedTaskBody = {
    title: "Finished database schema migration",
    description:
      "Successfully migrated production database to new schema version with zero downtime.",
    priority: "medium",
    status: "completed",
  } satisfies ITodoAppTask.ICreate;

  const completedTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: completedTaskBody,
    },
  );
  typia.assert(completedTask);

  TestValidator.equals(
    "completed task title matches",
    completedTask.title,
    completedTaskBody.title,
  );
  TestValidator.equals(
    "completed task description matches",
    completedTask.description,
    completedTaskBody.description,
  );
  TestValidator.equals(
    "completed task priority matches",
    completedTask.priority,
    completedTaskBody.priority,
  );
  TestValidator.equals(
    "completed task status matches",
    completedTask.status,
    completedTaskBody.status,
  );
  TestValidator.predicate(
    "completed task has completed_at timestamp",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );

  // Test 6: Create task with maximum title length
  const maxTitleTaskBody = {
    title: RandomGenerator.alphaNumeric(200), // Maximum 200 characters
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const maxTitleTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: maxTitleTaskBody,
    },
  );
  typia.assert(maxTitleTask);

  TestValidator.equals(
    "max title task title length equals 200",
    maxTitleTask.title.length,
    200,
  );
  TestValidator.equals(
    "max title task status matches",
    maxTitleTask.status,
    maxTitleTaskBody.status,
  );

  // Test 7: Create task with maximum description length
  const maxDescriptionTaskBody = {
    title: "Task with detailed description",
    description: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const maxDescriptionTask =
    await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: registeredUser.id,
      body: maxDescriptionTaskBody,
    });
  typia.assert(maxDescriptionTask);

  TestValidator.predicate(
    "max description task description length is at most 1000",
    maxDescriptionTask.description!.length <= 1000,
  );
  TestValidator.equals(
    "max description task status matches",
    maxDescriptionTask.status,
    maxDescriptionTaskBody.status,
  );

  // Test 8: Create task with all available fields
  const fullTaskBody = {
    title: "Comprehensive task with all fields populated",
    description:
      "This task demonstrates the use of all available task creation fields including priority levels and due dates.",
    status: "pending",
    priority: "low",
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  } satisfies ITodoAppTask.ICreate;

  const fullTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: registeredUser.id,
      body: fullTaskBody,
    },
  );
  typia.assert(fullTask);

  TestValidator.equals(
    "full task title matches",
    fullTask.title,
    fullTaskBody.title,
  );
  TestValidator.equals(
    "full task description matches",
    fullTask.description,
    fullTaskBody.description,
  );
  TestValidator.equals(
    "full task status matches",
    fullTask.status,
    fullTaskBody.status,
  );
  TestValidator.equals(
    "full task priority matches",
    fullTask.priority,
    fullTaskBody.priority,
  );
  TestValidator.equals(
    "full task due_date matches",
    fullTask.due_date,
    fullTaskBody.due_date,
  );

  // Validate that all tasks are properly associated with the authenticated user
  const allTasks = [
    basicTask,
    describedTask,
    priorityTask,
    dueDateTask,
    completedTask,
    maxTitleTask,
    maxDescriptionTask,
    fullTask,
  ];

  allTasks.forEach((task, index) => {
    TestValidator.predicate(
      `task ${index + 1} has user summary`,
      task.user !== null && task.user !== undefined,
    );
    TestValidator.equals(
      `task ${index + 1} user ID matches`,
      task.user.id,
      registeredUser.id,
    );
    TestValidator.equals(
      `task ${index + 1} user email matches`,
      task.user.email,
      registeredUser.email,
    );

    // Validate timestamps are generated by server
    TestValidator.predicate(
      `task ${index + 1} has valid created_at`,
      new Date(task.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      `task ${index + 1} has valid updated_at`,
      new Date(task.updated_at).getTime() > 0,
    );
    TestValidator.predicate(
      `task ${index + 1} updated_at >= created_at`,
      new Date(task.updated_at).getTime() >=
        new Date(task.created_at).getTime(),
    );
  });

  // Test with different priority levels
  const priorityLevels = ["none", "low", "medium", "high"] as const;

  const priorityTasks = await ArrayUtil.asyncRepeat(
    priorityLevels.length,
    async (index) => {
      const priority = priorityLevels[index];
      const taskBody = {
        title: `Task with ${priority} priority`,
        priority: priority,
        status: "pending",
      } satisfies ITodoAppTask.ICreate;

      return await api.functional.todoApp.user.users.tasks.create(connection, {
        userId: registeredUser.id,
        body: taskBody,
      });
    },
  );

  priorityTasks.forEach((task, index) => {
    TestValidator.equals(
      `priority task ${index + 1} priority matches`,
      task.priority,
      priorityLevels[index],
    );
  });
}
