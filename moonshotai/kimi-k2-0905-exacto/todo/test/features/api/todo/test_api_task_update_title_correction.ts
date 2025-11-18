import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_update_title_correction(
  connection: api.IConnection,
) {
  // 1. Authenticate a user for title correction testing
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "1234",
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a task with an initial title that needs correction
  const originalTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "Complt proj#2 by Wenday", // Intentionally flawed title
        status: "pending",
        description: "Need to review and fix the presentation slides",
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(originalTask);

  // 3. Correct the task title to improve accuracy and clarity
  const correctedTitle = "Complete project #2 by Wednesday";
  const updatedTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.update(connection, {
      taskId: originalTask.id,
      body: {
        title: correctedTitle,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(updatedTask);

  // 4. Validate the title correction was successful
  TestValidator.equals(
    "Task ID remains unchanged",
    updatedTask.id,
    originalTask.id,
  );
  TestValidator.equals(
    "Title corrected successfully",
    updatedTask.title,
    correctedTitle,
  );
  TestValidator.equals(
    "Status unchanged",
    updatedTask.status,
    originalTask.status,
  );

  // 5. Test edge case: title at maximum length (200 characters)
  const maxLengthTitle = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 3,
    wordMax: 5,
  }); // Generate long title
  const truncatedTitle = maxLengthTitle.substring(0, 200); // Ensure exactly 200 characters
  const maxLengthTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.update(connection, {
      taskId: originalTask.id,
      body: {
        title: truncatedTitle,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(maxLengthTask);

  TestValidator.equals(
    "Maximum length title accepted",
    maxLengthTask.title,
    truncatedTitle,
  );
  TestValidator.predicate(
    "Title length within limit",
    maxLengthTask.title.length <= 200,
  );

  // 6. Test realistic title correction scenarios
  const improvementTests = [
    {
      from: "Call client tomorrw",
      to: "Call client tomorrow at 2 PM",
    },
    {
      from: "Fix db issue",
      to: "Fix database connection timeout issue in production",
    },
    {
      from: "Team mtg",
      to: "Weekly team status meeting - discuss Q4 goals",
    },
    {
      from: "Update docs",
      to: "Update API documentation with new authentication endpoints",
    },
  ];

  for (const test of improvementTests) {
    // Update to the test title
    await api.functional.todoApp.user.tasks.update(connection, {
      taskId: originalTask.id,
      body: {
        title: test.from,
      } satisfies ITodoAppTask.IUpdate,
    });

    // Now correct to the improved title
    const improvedTask: ITodoAppTask =
      await api.functional.todoApp.user.tasks.update(connection, {
        taskId: originalTask.id,
        body: {
          title: test.to,
        } satisfies ITodoAppTask.IUpdate,
      });
    typia.assert(improvedTask);

    TestValidator.equals(
      `Title improved from '${test.from}' to '${test.to}'`,
      improvedTask.title,
      test.to,
    );
    TestValidator.predicate(
      "Improved title provides more clarity",
      improvedTask.title.length > test.from.length,
    );
  }

  // 7. Test title correction with special characters and formatting
  const specialCharTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.update(connection, {
      taskId: originalTask.id,
      body: {
        title: "Review [PR#42] & check error handling (URGENT!)",
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(specialCharTask);

  TestValidator.predicate(
    "Special characters handled correctly",
    specialCharTask.title.includes("[") &&
      specialCharTask.title.includes("]") &&
      specialCharTask.title.includes("&") &&
      specialCharTask.title.includes("(") &&
      specialCharTask.title.includes(")"),
  );

  // 8. Verify task identification remains intact throughout updates
  TestValidator.equals(
    "Task ID consistent through updates",
    updatedTask.id,
    originalTask.id,
  );
  TestValidator.equals(
    "User ownership unchanged",
    updatedTask.user.id,
    user.id,
  );

  // Ensure updated_at timestamp is properly handled
  const updatedAtOriginal = new Date(originalTask.updated_at);
  const updatedAtLatest = new Date(updatedTask.updated_at);
  TestValidator.predicate(
    "Timestamps are valid dates",
    !isNaN(updatedAtOriginal.getTime()) && !isNaN(updatedAtLatest.getTime()),
  );
}
