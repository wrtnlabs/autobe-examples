import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_category_delete_preserve_integrity(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for deletion operation
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: RandomGenerator.alphaNumeric(10),
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test category to be deleted
  const categoryCode = RandomGenerator.alphaNumeric(10);
  const categoryToDelete =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(categoryToDelete);

  // Step 3: Delete the category (soft deletion)
  const deletedCategory =
    await api.functional.economicDiscussion.moderator.categories.erase(
      connection,
      {
        categoryCode: categoryToDelete.code,
      },
    );
  typia.assert(deletedCategory);

  // Step 4: Verify deletion metadata is preserved
  TestValidator.notEquals(
    "Category should have deletion timestamp",
    deletedCategory.deleted_at,
    null,
  );
  TestValidator.equals(
    "Category code should be preserved",
    deletedCategory.code,
    categoryToDelete.code,
  );
  TestValidator.equals(
    "All historical data should be maintained",
    deletedCategory.id,
    categoryToDelete.id,
  );
  TestValidator.equals(
    "Article count should be preserved",
    deletedCategory.article_count,
    categoryToDelete.article_count,
  );
  TestValidator.equals(
    "Creation date should be preserved",
    deletedCategory.created_at,
    categoryToDelete.created_at,
  );
  TestValidator.equals(
    "Code uniqueness should be maintained",
    deletedCategory.code,
    categoryToDelete.code,
  );

  // Step 5: Verify the category is marked as deleted but data integrity is preserved
  TestValidator.predicate(
    "deleted_at should be valid timestamp",
    deletedCategory.deleted_at !== null,
  );
  TestValidator.predicate(
    "Category should still have all its properties",
    deletedCategory.name === categoryToDelete.name,
  );
  TestValidator.predicate(
    "deleted_at timestamp should be after creation",
    new Date(deletedCategory.deleted_at!).getTime() >
      new Date(categoryToDelete.created_at).getTime(),
  );

  // Step 6: Attempt to create new category with same code (should fail)
  await TestValidator.error("Cannot reuse deleted category code", async () => {
    await await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryToDelete.code,
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  });
}
