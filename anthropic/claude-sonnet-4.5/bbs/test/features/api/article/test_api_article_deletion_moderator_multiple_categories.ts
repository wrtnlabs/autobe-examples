import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator deletion of articles across different categories.
 *
 * This test validates that moderators have consistent deletion privileges
 * across all discussion board categories. The test creates multiple categories
 * (Economic Discussion and Political Discussion), has a member create articles
 * in each category, then verifies that a moderator can successfully delete
 * articles from any category regardless of the category assignment.
 *
 * This ensures uniform moderation capabilities across the entire platform,
 * confirming that category boundaries do not restrict moderator privileges.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator and create two categories
 * 2. Switch to member authentication and create articles in both categories
 * 3. Switch back to moderator and delete articles from both categories
 * 4. Verify successful soft deletion with deleted_at timestamps
 */
export async function test_api_article_deletion_moderator_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/admin",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create Economic Discussion category
  const economicCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policy, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economicCategory);

  // Step 3: Create Political Discussion category
  const politicalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description:
            "Discussions about governance, elections, and political systems",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicalCategory);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Member creates article in Economic Discussion category
  const economicArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: economicCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(economicArticle);

  // Step 6: Member creates article in Political Discussion category
  const politicalArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: politicalCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(politicalArticle);

  // Step 7: Switch back to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/admin",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 8: Moderator deletes article from Economic Discussion category
  const deletedEconomicArticle =
    await api.functional.discussionBoard.moderator.articles.erase(connection, {
      articleId: economicArticle.id,
    });
  typia.assert(deletedEconomicArticle);

  // Step 9: Verify Economic Discussion article deletion
  TestValidator.predicate(
    "economic article should have deleted_at timestamp",
    deletedEconomicArticle.deleted_at !== null &&
      deletedEconomicArticle.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted economic article ID matches",
    deletedEconomicArticle.id,
    economicArticle.id,
  );

  // Step 10: Moderator deletes article from Political Discussion category
  const deletedPoliticalArticle =
    await api.functional.discussionBoard.moderator.articles.erase(connection, {
      articleId: politicalArticle.id,
    });
  typia.assert(deletedPoliticalArticle);

  // Step 11: Verify Political Discussion article deletion
  TestValidator.predicate(
    "political article should have deleted_at timestamp",
    deletedPoliticalArticle.deleted_at !== null &&
      deletedPoliticalArticle.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted political article ID matches",
    deletedPoliticalArticle.id,
    politicalArticle.id,
  );

  // Step 12: Verify moderator can delete from different categories
  TestValidator.notEquals(
    "articles belong to different categories",
    economicArticle.category.id,
    politicalArticle.category.id,
  );
}
