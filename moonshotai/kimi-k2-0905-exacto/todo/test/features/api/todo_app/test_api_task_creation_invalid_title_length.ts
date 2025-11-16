import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with invalid title lengths to validate input validation.
 *
 * This comprehensive test validates the todo application's title field
 * validation by testing boundary conditions and error handling for task
 * creation. The test follows these steps:
 *
 * 1. Create a user account to establish authentication context
 * 2. Test creating a task with empty title (should fail validation)
 * 3. Test creating a task with title exceeding 200 characters (should fail
 *    validation)
 * 4. Create a task with valid title length to ensure system works correctly
 * 5. Verify error responses and confirm validation is working properly
 *
 * The test confirms that the system properly enforces the MinLength<1> and
 * MaxLength<200> constraints defined in the ITodoAppTask.ICreate DTO type.
 */
export async function test_api_task_creation_invalid_title_length(
  connection: api.IConnection,
) {
  // Create user account to establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "Password123",
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Test 1: Create task with empty title (should fail)
  await TestValidator.error("empty title should be rejected", async () => {
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "",
        description: {
          type: "full",
          content: "This should fail without title",
        },
      } satisfies ITodoAppTask.ICreate,
    });
  });

  // Test 2: Create task with title exceeding 200 characters (should fail)
  // Generate a title with 201 characters to exceed the 200 character limit
  const longTitle = ArrayUtil.repeat(201, () =>
    RandomGenerator.alphabets(1),
  ).join("");

  await TestValidator.error(
    "title exceeding 200 characters should be rejected",
    async () => {
      await api.functional.todoApp.user.tasks.create(connection, {
        body: {
          title: longTitle,
          description: {
            type: "full",
            content: "This long title should be rejected",
          },
        } satisfies ITodoAppTask.ICreate,
      });
    },
  );

  // Test 3: Create valid task to confirm system works
  const resultWithValidTitle = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 6,
        }),
        description: {
          type: "full",
          content: "This valid task should be created successfully",
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(resultWithValidTitle);

  // Additional validation with boundary cases
  // Test minimum valid length (1 character)
  const minValidTitle = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "A", // Exactly 1 character
        description: {
          type: "full",
          content: "Minimum valid title",
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );

  TestValidator.equals(
    "minimum valid title has correct length",
    minValidTitle.title.length,
    1,
  );

  // Test maximum valid length (200 characters)
  const maxValidTitle = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(200), // Exactly 200 characters
        description: {
          type: "full",
          content: "Maximum valid title",
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );

  TestValidator.equals(
    "maximum valid title has correct length",
    maxValidTitle.title.length,
    200,
  );
}
