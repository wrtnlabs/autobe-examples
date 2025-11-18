import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deletion of a category when user has multiple categories remaining.
 * Validates that deletion of one category does not affect other categories in
 * the user's account. Confirms that organizational restructuring can be
 * performed safely while preserving existing categorization schemes.
 */
export async function test_api_categorydeletion_multiple_categories(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create three categories for organizational testing
  const workCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Tasks",
        description: "Professional and work-related todo items",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(workCategory);

  const personalCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Personal Goals",
        description: "Personal development and life goals",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(personalCategory);

  const shoppingCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Shopping List",
        description: "Items to purchase and shopping reminders",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(shoppingCategory);

  // Step 3: Verify initial category setup - all categories exist with correct properties
  TestValidator.equals("work category name", workCategory.name, "Work Tasks");
  TestValidator.equals(
    "personal category name",
    personalCategory.name,
    "Personal Goals",
  );
  TestValidator.equals(
    "shopping category name",
    shoppingCategory.name,
    "Shopping List",
  );
  TestValidator.equals(
    "all categories belong to same user",
    workCategory.user.id,
    personalCategory.user.id,
  );
  TestValidator.equals(
    "user consistency",
    personalCategory.user.id,
    shoppingCategory.user.id,
  );

  // Step 4: Delete one category (Work) for organizational restructuring test
  const deletedWorkCategory =
    await api.functional.todoApp.user.categories.erase(connection, {
      categoryId: workCategory.id,
    });
  typia.assert(deletedWorkCategory);

  // Step 5: Verify the deleted category matches what was removed
  TestValidator.equals(
    "deleted category ID matches",
    deletedWorkCategory.id,
    workCategory.id,
  );
  TestValidator.equals(
    "deleted category name matches",
    deletedWorkCategory.name,
    "Work Tasks",
  );

  // Step 6: Confirm remaining categories are unaffected by the deletion
  // Personal category should remain intact
  TestValidator.equals(
    "personal category preserved",
    personalCategory.name,
    "Personal Goals",
  );
  TestValidator.equals(
    "personal category user unchanged",
    personalCategory.user.id,
    user.id,
  );
  TestValidator.predicate(
    "personal category has valid timestamps",
    () =>
      personalCategory.created_at !== null &&
      personalCategory.updated_at !== null,
  );

  // Shopping category should remain intact
  TestValidator.equals(
    "shopping category preserved",
    shoppingCategory.name,
    "Shopping List",
  );
  TestValidator.equals(
    "shopping category user unchanged",
    shoppingCategory.user.id,
    user.id,
  );
  TestValidator.predicate(
    "shopping category has valid timestamps",
    () =>
      shoppingCategory.created_at !== null &&
      shoppingCategory.updated_at !== null,
  );

  // Step 7: Validate organizational data integrity after restructuring
  TestValidator.predicate(
    "deleted category has valid timestamps",
    () =>
      deletedWorkCategory.created_at !== null &&
      deletedWorkCategory.updated_at !== null,
  );
  TestValidator.predicate(
    "all categories have unique IDs",
    () =>
      personalCategory.id !== shoppingCategory.id &&
      personalCategory.id !== deletedWorkCategory.id &&
      shoppingCategory.id !== deletedWorkCategory.id,
  );

  // Verify user authorization context is maintained
  TestValidator.equals(
    "user authentication preserved",
    deletedWorkCategory.user.id,
    user.id,
  );
  TestValidator.equals(
    "user email consistency",
    deletedWorkCategory.user.email,
    userEmail,
  );

  // Confirm category deletion enables safe organizational restructuring
  TestValidator.predicate(
    "category deletion successful",
    () => deletedWorkCategory.name === "Work Tasks",
  );
  TestValidator.predicate(
    "remaining categories unaffected",
    () =>
      personalCategory.description === "Personal development and life goals" &&
      shoppingCategory.description ===
        "Items to purchase and shopping reminders",
  );
}
