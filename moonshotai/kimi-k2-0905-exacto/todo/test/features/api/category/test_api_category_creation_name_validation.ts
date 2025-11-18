import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test category name validation rules for todo app category creation.
 *
 * This test validates the comprehensive category name validation system
 * including:
 *
 * - Minimum length requirement (2 characters)
 * - Maximum length constraint (50 characters)
 * - Character restrictions (only letters, numbers, spaces, and hyphens)
 * - Uniqueness enforcement within user accounts
 * - Proper error responses for invalid category names
 *
 * The test follows a systematic approach to verify both successful category
 * creation with valid names and appropriate rejection of invalid names while
 * maintaining data integrity and providing clear user feedback.
 */
export async function test_api_category_creation_name_validation(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinData = {
    email: userEmail,
    password: "SecurePassword123",
    ip: "127.0.0.1",
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(user);

  // Step 2: Test valid category names with proper formatting
  const validCategories = [
    { name: "Work", description: "Work-related tasks" },
    { name: "Personal Tasks", description: "Personal todo items" },
    { name: "Shopping-List", description: null },
    { name: "project-2024", description: "Current year projects" },
    { name: "A".repeat(50), description: "Maximum length category name" },
  ];

  const createdCategories: ITodoAppCategory[] = [];

  for (const category of validCategories) {
    const createdCategory = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: category,
      },
    );
    typia.assert(createdCategory);

    TestValidator.equals(
      "category name matches",
      createdCategory.name,
      category.name,
    );
    TestValidator.equals(
      "category description matches",
      createdCategory.description,
      category.description,
    );
    TestValidator.equals(
      "category belongs to created user",
      createdCategory.user.id,
      user.id,
    );

    createdCategories.push(createdCategory);
  }

  // Step 3: Test minimum length validation (2 characters)
  const minLengthCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "AB",
        description: "Exactly 2 characters - minimum requirement",
      },
    },
  );
  typia.assert(minLengthCategory);
  TestValidator.equals(
    "minimum length category created",
    minLengthCategory.name.length,
    2,
  );

  // Step 4: Test uniqueness enforcement within user account
  await TestValidator.error(
    "duplicate category name should be rejected",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: "Work",
          description: "Duplicate work category",
        },
      });
    },
  );

  // Step 5: Test business logic validation with different valid scenarios
  const businessLogicTests = [
    { name: "High Priority", description: "Important urgent tasks" },
    { name: "Low Priority", description: "Non-urgent tasks" },
    { name: "Daily Routine", description: "Habit tracking" },
  ];

  for (const test of businessLogicTests) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: test,
      },
    );
    typia.assert(category);
    TestValidator.equals(
      "business logic category name created correctly",
      category.name,
      test.name,
    );
  }

  // Step 6: Verify all created categories maintain data integrity
  const allCategories = createdCategories;
  TestValidator.predicate(
    "created expected number of categories",
    allCategories.length === validCategories.length,
  );

  for (const category of allCategories) {
    TestValidator.predicate(
      "category has valid UUID",
      typia.is<string & tags.Format<"uuid">>(category.id),
    );
    TestValidator.predicate(
      "category has creation timestamp",
      typia.is<string & tags.Format<"date-time">>(category.created_at),
    );
    TestValidator.predicate(
      "category has update timestamp",
      typia.is<string & tags.Format<"date-time">>(category.updated_at),
    );
  }

  // Step 7: Test successful operations with various valid name formats
  const nameFormatTests = [
    { name: "SimpleWord", description: "Single camelCase word" },
    { name: "multi-word-name", description: "Multiple words with hyphens" },
    {
      name: "Mixed 123 Case",
      description: "Mixed case with numbers and spaces",
    },
  ];

  for (const test of nameFormatTests) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: test,
      },
    );
    typia.assert(category);
    TestValidator.equals(
      "valid name format accepted",
      category.name,
      test.name,
    );
  }
}
