import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test proper error handling when attempting to associate a category with a
 * non-existent article.
 *
 * This test validates system robustness and data validation by creating a
 * member account and attempting to associate a category with a fabricated
 * article ID that doesn't exist in the system. The operation should fail
 * gracefully with appropriate error messaging while maintaining system
 * integrity and preventing database inconsistencies.
 *
 * Test flow:
 *
 * 1. Create a new member account through registration
 * 2. Generate a random UUID that doesn't correspond to any existing article
 * 3. Attempt to attach a category to this non-existent article
 * 4. Verify that the operation fails with an appropriate error
 * 5. Ensure system integrity is maintained
 */
export async function test_api_article_category_nonexistent_article_handling(
  connection: api.IConnection,
) {
  // Create a new member account for testing
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Generate a random UUID that doesn't correspond to any existing article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Generate a random category code
  const categoryCode = RandomGenerator.alphaNumeric(8);

  // Attempt to attach category to non-existent article - this should fail
  await TestValidator.error(
    "should fail when attaching category to non-existent article",
    async () => {
      await api.functional.economicDiscussion.member.articles.categories.attachCategory(
        connection,
        {
          articleId: nonExistentArticleId,
          categoryCode: categoryCode,
        },
      );
    },
  );

  // Verify that the member account creation was successful (sanity check)
  TestValidator.predicate(
    "member account should be created successfully",
    member.member.id.length > 0,
  );

  TestValidator.predicate(
    "member username should match registration data",
    member.member.username === memberData.username,
  );

  TestValidator.predicate(
    "member email should match registration data",
    member.member.email === memberData.email,
  );
}
