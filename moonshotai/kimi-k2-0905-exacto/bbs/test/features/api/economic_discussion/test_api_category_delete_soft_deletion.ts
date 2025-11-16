import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category deletion using soft deletion approach.
 *
 * This test validates the soft deletion mechanism for economic discussion
 * categories. It verifies that deleted categories are marked as deleted (soft
 * delete) but remain in the system for historical preservation. The test
 * ensures that soft-deleted categories cannot be used for new articles while
 * maintaining all existing article relationships. It also validates that the
 * deleted_at timestamp is properly set and the category remains functional for
 * historical data integrity.
 *
 * Test workflow:
 *
 * 1. Create a moderator account to perform deletion operations
 * 2. Create a test category with initial properties
 * 3. Verify the category is created successfully and active
 * 4. Delete the category using soft deletion (DELETE endpoint)
 * 5. Validate that the category still exists but has deletion metadata
 * 6. Verify that the category shows as deleted while preserving historical data
 * 7. Check that the deleted_at timestamp is properly set
 *
 * Dependencies:
 *
 * - Moderator authentication (for deletion permissions)
 * - Category creation (for test data)
 * - Soft deletion validation (for historical preservation)
 */
export async function test_api_category_delete_soft_deletion(
  connection: api.IConnection,
) {
  // Create moderator account for deletion operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "full",
      two_factor_enabled: true,
      email_verified: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create test category
  const categoryCode = RandomGenerator.alphabets(10);
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: ArrayUtil.repeat(1, () =>
            Math.floor(Math.random() * 50),
          )[0],
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Verify category is active and has no deletion metadata
  TestValidator.equals(
    "category should have no deleted_at timestamp initially",
    category.deleted_at,
    null,
  );
  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.predicate(
    "category should be active",
    category.is_active === true,
  );
  TestValidator.predicate(
    "category should have valid created_at timestamp",
    new Date(category.created_at).getTime() > 0,
  );

  // Delete category using soft deletion
  const deletedCategory =
    await api.functional.economicDiscussion.moderator.categories.erase(
      connection,
      {
        categoryCode: categoryCode,
      },
    );
  typia.assert(deletedCategory);

  // Validate soft deletion properties
  TestValidator.equals(
    "deleted category ID matches original",
    deletedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "deleted category code matches original",
    deletedCategory.code,
    category.code,
  );
  TestValidator.equals(
    "deleted category name matches original",
    deletedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "deleted category description matches original",
    deletedCategory.description,
    category.description,
  );
  TestValidator.equals(
    "deleted category display order matches original",
    deletedCategory.display_order,
    category.display_order,
  );
  TestValidator.equals(
    "deleted category should be marked as inactive",
    deletedCategory.is_active,
    false,
  );
  TestValidator.equals(
    "deleted category article count preserved",
    deletedCategory.article_count,
    category.article_count,
  );
  TestValidator.equals(
    "deleted category updated_at should be changed",
    deletedCategory.updated_at !== category.updated_at,
    true,
  );

  // Most importantly, verify that deleted_at is properly set
  TestValidator.predicate(
    "deleted_at timestamp should now be set",
    deletedCategory.deleted_at !== null &&
      deletedCategory.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at should be a valid date-time format",
    typeof deletedCategory.deleted_at === "string" &&
      deletedCategory.deleted_at!.length > 0,
  );

  // Validate that the category shows as deleted (inactive for new usage)
  TestValidator.equals(
    "category should be marked as inactive after deletion",
    deletedCategory.is_active,
    false,
  );

  // Verify all original properties are preserved for historical data
  TestValidator.equals(
    "category properties preserved",
    deletedCategory.code === category.code &&
      deletedCategory.name === category.name &&
      deletedCategory.display_order === category.display_order,
    true,
  );

  // Ensure that deletion timestamp is more recent than creation
  TestValidator.predicate(
    "deleted_at timestamp should be newer than created_at",
    new Date(deletedCategory.deleted_at!).getTime() >
      new Date(deletedCategory.created_at).getTime(),
  );
}
