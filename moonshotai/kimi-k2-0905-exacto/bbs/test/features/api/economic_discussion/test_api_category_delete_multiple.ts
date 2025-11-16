import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test deletion of multiple categories to ensure consistent behavior across
 * multiple operations. Verify that each deletion operation properly marks the
 * category as deleted and maintains system stability when multiple categories
 * are removed. Test covers the complete workflow from moderator authentication
 * through sequential category deletions.
 */
export async function test_api_category_delete_multiple(
  connection: api.IConnection,
) {
  // Create moderator account for authentication and authorization
  const moderatorEmail = `test.moderator.${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorUsername = `mod_user_${RandomGenerator.alphaNumeric(10)}`;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created successfully",
    moderator.email,
    moderatorEmail,
  );

  // Create multiple test categories for deletion
  const categoryCount = 3;
  const categories = await ArrayUtil.asyncRepeat(
    categoryCount,
    async (index) => {
      const categoryCode = `test_cat_${index}_${Date.now()}`;
      const category =
        await api.functional.economicDiscussion.moderator.categories.create(
          connection,
          {
            body: {
              code: categoryCode,
              name: `Test Category ${index}`,
              display_order: index,
              is_active: true,
              description: RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 4,
                wordMax: 8,
              }),
            } satisfies IEconomicDiscussionCategory.ICreate,
          },
        );
      typia.assert(category);
      TestValidator.equals(
        "category created correctly",
        category.code,
        categoryCode,
      );
      return category;
    },
  );

  // Perform sequential deletion of all categories
  const deletedCategories: IEconomicDiscussionCategory[] = [];
  for (const category of categories) {
    const deleted =
      await api.functional.economicDiscussion.moderator.categories.erase(
        connection,
        {
          categoryCode: category.code,
        },
      );
    typia.assert(deleted);

    // Verify deletion timestamp is set
    TestValidator.predicate(
      "category has deletion timestamp",
      deleted.deleted_at !== null && deleted.deleted_at !== undefined,
    );
    TestValidator.equals(
      "deleted category code matches original",
      deleted.code,
      category.code,
    );
    TestValidator.equals(
      "deleted category name matches original",
      deleted.name,
      category.name,
    );

    deletedCategories.push(deleted);
  }

  // Validate all deletions completed successfully
  TestValidator.equals(
    "all categories were deleted",
    deletedCategories.length,
    categoryCount,
  );

  // Verify timestamps were properly captured for all deletions
  for (const deleted of deletedCategories) {
    TestValidator.predicate(
      "deleted category has valid timestamp",
      typia.is<string & tags.Format<"date-time">>(deleted.deleted_at!),
    );
  }

  // Final validation of system stability after multiple deletions
  TestValidator.predicate(
    "deletion timestamps are monotonic increasing",
    () => {
      const timestamps = deletedCategories.map((d) =>
        new Date(d.deleted_at!).getTime(),
      );
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] < timestamps[i - 1]) {
          return false;
        }
      }
      return true;
    },
  );
}
