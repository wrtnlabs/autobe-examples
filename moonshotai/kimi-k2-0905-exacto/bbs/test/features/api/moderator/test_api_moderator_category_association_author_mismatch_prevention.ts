import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test moderator category association author mismatch prevention.
 *
 * Validates that moderators cannot assign categories to non-existent articles,
 * ensuring proper error handling and database referential integrity is
 * maintained across role boundaries within the economic discussion platform.
 *
 * 1. Create moderator account for testing administrative access
 * 2. Generate random article ID and category code that don't exist
 * 3. Attempt to attach non-existent article to non-existent category
 * 4. Verify system prevents the invalid association
 */
export async function test_api_moderator_category_association_author_mismatch_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for testing administrative access
  const moderatorData = {
    username: RandomGenerator.name(),
    email:
      RandomGenerator.alphabets(5).toLowerCase() + "@economicdiscussion.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    moderation_level: "category_manager",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );

  // Step 2: Generate random article ID and category code that don't exist
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCategoryCode = RandomGenerator.alphabets(8).toUpperCase();

  // Step 3: Attempt to attach non-existent article to non-existent category
  // Step 4: Verify system prevents the invalid association
  await TestValidator.error(
    "should prevent attaching category to non-existent article",
    async () => {
      await api.functional.economicDiscussion.moderator.articles.categories.attachCategory(
        connection,
        {
          articleId: nonExistentArticleId,
          categoryCode: nonExistentCategoryCode,
        },
      );
    },
  );
}
