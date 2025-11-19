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
 * Test article creation with various body content lengths to validate the
 * 50-50000 character constraint.
 *
 * This test validates that the system enforces minimum substantive content
 * requirements (50 characters) and prevents excessively long articles (50000
 * character maximum). Test verifies that bodies with fewer than 50 characters
 * are rejected, exactly 50 characters are accepted, 50000 characters are
 * accepted, and content exceeding 50000 characters is rejected.
 *
 * Test Flow:
 *
 * 1. Create moderator account
 * 2. Create article category
 * 3. Create member account
 * 4. Test body length below minimum (49 chars) - should fail
 * 5. Test body length at minimum boundary (50 chars) - should succeed
 * 6. Test body length at maximum boundary (50000 chars) - should succeed
 * 7. Test body length above maximum (50001 chars) - should fail
 */
export async function test_api_article_creation_body_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion category for testing",
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
      password: "member123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Test body length below minimum (49 characters) - should fail
  const bodyTooShort = RandomGenerator.alphabets(49);
  await TestValidator.error(
    "body with 49 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: "Test Article Title",
          body: bodyTooShort,
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    },
  );

  // Step 5: Test body length at minimum boundary (exactly 50 characters) - should succeed
  const bodyMinimum = RandomGenerator.alphabets(50);
  const articleMinimum =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Article With Minimum Body Length",
        body: bodyMinimum,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(articleMinimum);
  TestValidator.equals(
    "minimum body length matches",
    articleMinimum.body,
    bodyMinimum,
  );

  // Step 6: Test body length at maximum boundary (exactly 50000 characters) - should succeed
  const bodyMaximum = RandomGenerator.alphabets(50000);
  const articleMaximum =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Article With Maximum Body Length",
        body: bodyMaximum,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(articleMaximum);
  TestValidator.equals(
    "maximum body length matches",
    articleMaximum.body,
    bodyMaximum,
  );

  // Step 7: Test body length above maximum (50001 characters) - should fail
  const bodyTooLong = RandomGenerator.alphabets(50001);
  await TestValidator.error(
    "body with 50001 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: "Test Article Exceeding Maximum",
          body: bodyTooLong,
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    },
  );
}
