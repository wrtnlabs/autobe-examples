import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_completion_workflow_with_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for task management
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: "https://example.com/todo-app",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a new task for the authenticated user
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
  } satisfies ITodoAppTask.ICreate;

  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: taskData,
  });
  typia.assert(task);

  // Step 3: Verify the task exists in the user's task list
  const searchResult = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 4: Validate the created task appears in search results
  TestValidator.predicate(
    "created task appears in user's task list",
    searchResult.data.some((t) => t.id === task.id && t.title === task.title),
  );

  TestValidator.equals("task has correct owner", task.user.id, user.id);
  TestValidator.equals("task title matches", task.title, taskData.title);
  TestValidator.equals(
    "task description matches",
    task.description,
    taskData.description,
  );
  TestValidator.equals("task status is pending", task.status, "pending");
  TestValidator.predicate(
    "task priority is valid",
    ["none", "low", "medium", "high"].includes(task.priority || "medium"),
  );

  // Step 5: Delete the task permanently
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: task.id,
    },
  );
  typia.assert(deletedTask);

  TestValidator.equals(
    "deleted task is the same as created task",
    deletedTask.id,
    task.id,
  );
  TestValidator.equals(
    "deleted task retains title",
    deletedTask.title,
    task.title,
  );

  // Step 6: Verify task no longer appears in user's task list
  const verificationSearch = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(verificationSearch);

  TestValidator.predicate(
    "task is completely removed from user's task list",
    !verificationSearch.data.some((t) => t.id === task.id),
  );

  TestValidator.equals(
    "task count decreased after deletion",
    verificationSearch.data.length,
    searchResult.data.length - 1,
  );
  TestValidator.predicate(
    "tasks have valid status",
    verificationSearch.data.every(
      (t) => t.status === "pending" || t.status === "completed",
    ),
  );
}
