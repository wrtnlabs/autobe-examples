import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_creation_complete(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securepassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a category for task organization
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Prepare task data with all optional fields
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const taskTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const taskDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const taskPriority = RandomGenerator.pick(["Low", "Medium", "High"] as const);
  const completionOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  // Step 4: Create task with comprehensive data
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
      description: taskDescription,
      todo_app_category_id: category.id,
      priority: taskPriority,
      due_date: dueDate,
      completion_order: completionOrder,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Step 5: Validate comprehensive task creation
  TestValidator.equals("task title matches input", task.title, taskTitle);
  TestValidator.equals(
    "task description matches input",
    task.description,
    taskDescription,
  );
  TestValidator.equals(
    "task category ID matches created category",
    task.category?.id,
    category.id,
  );
  TestValidator.equals(
    "task category name matches created category",
    task.category?.name,
    category.name,
  );
  TestValidator.equals(
    "task priority matches input",
    task.priority,
    taskPriority,
  );
  TestValidator.equals("task due date matches input", task.due_date, dueDate);
  TestValidator.equals(
    "task completion order matches input",
    task.completion_order,
    completionOrder,
  );
  TestValidator.equals(
    "task user ID matches authenticated user",
    task.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches authenticated user",
    task.user.email,
    userEmail,
  );
  TestValidator.equals("task status is pending", task.status, "pending");
  TestValidator.predicate(
    "task has creation timestamp",
    task.created_at !== null,
  );
  TestValidator.predicate(
    "task has update timestamp",
    task.updated_at !== null,
  );
}
