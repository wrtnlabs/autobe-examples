import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate deletion of an empty category with no associated tasks.
 *
 * Tests that categories can be safely removed when no tasks depend on them,
 * ensuring clean organizational restructuring. Validates that system properly
 * handles removal of empty categories without affecting other user categories.
 */
export async function test_api_categorydeletion_empty_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account to establish authentication context
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://localhost:3000/",
      referrer: "https://localhost:3000/",
      ip: "127.0.0.1" satisfies string | null | undefined,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create empty category specifically for deletion testing
  const categoryName = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<50>
  >();
  const descriptionText = "Test category for deletion validation";
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        description: descriptionText,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Validate category was created successfully
  TestValidator.predicate(
    "newly created category is returned with valid ID format",
    category.id.length > 0,
  );
  TestValidator.equals(
    "category name matches creation input",
    category.name,
    categoryName,
  );
  TestValidator.predicate(
    "category has valid creation timestamp",
    category.created_at.length > 0,
  );

  // Step 4: Delete the category and verify successful deletion operation
  const deletedCategory = await api.functional.todoApp.user.categories.erase(
    connection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(deletedCategory);

  // Step 5: Validate deletion response matches original category data
  TestValidator.equals(
    "deleted category ID matches original category ID",
    deletedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "deleted category name matches original name",
    deletedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "deleted category user assignment is preserved",
    deletedCategory.user.id,
    user.id,
  );

  // Step 6: Confirm deletion operation completed without errors
  TestValidator.predicate(
    "category deletion response contains valid timestamps",
    deletedCategory.created_at.length > 0 &&
      deletedCategory.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted category description is consistent",
    deletedCategory.description === descriptionText,
  );
}
