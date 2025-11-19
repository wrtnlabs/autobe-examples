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
 * Test article creation with various title lengths to validate the 5-200
 * character constraint.
 *
 * This test validates the business rule that article titles must be between 5
 * and 200 characters to ensure they are concise yet descriptive enough to
 * convey the discussion topic.
 *
 * Test flow:
 *
 * 1. Create moderator account for category management
 * 2. Create article category (prerequisite for article creation)
 * 3. Create member account for article authorship
 * 4. Test boundary values:
 *
 *    - 4 characters (below minimum) - should fail
 *    - 5 characters (exact minimum) - should succeed
 *    - 200 characters (exact maximum) - should succeed
 *    - 201 characters (above maximum) - should fail
 */
export async function test_api_article_creation_title_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discuss economic policies and market trends",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Common test data
  const validBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 20,
    sentenceMax: 30,
  });

  // Test Case 1: Title with 4 characters (below minimum) - should fail
  await TestValidator.error(
    "article creation should fail with title length 4 (below minimum 5)",
    async () => {
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: "abcd",
          body: validBody,
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    },
  );

  // Test Case 2: Title with 5 characters (exact minimum) - should succeed
  const article5 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "abcde",
        body: validBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article5);
  TestValidator.equals(
    "title length 5 should be accepted",
    article5.title.length,
    5,
  );

  // Test Case 3: Title with 200 characters (exact maximum) - should succeed
  const title200 = "a".repeat(200);
  const article200 =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: title200,
        body: validBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article200);
  TestValidator.equals(
    "title length 200 should be accepted",
    article200.title.length,
    200,
  );

  // Test Case 4: Title with 201 characters (above maximum) - should fail
  await TestValidator.error(
    "article creation should fail with title length 201 (above maximum 200)",
    async () => {
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: "a".repeat(201),
          body: validBody,
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    },
  );
}
