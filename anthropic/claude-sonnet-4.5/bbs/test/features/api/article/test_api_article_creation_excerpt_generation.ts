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
 * Test automatic excerpt generation from article body content.
 *
 * Validates that the excerpt field is automatically populated from the first
 * 200 characters of the body content for use in article listings and previews.
 * Tests three scenarios:
 *
 * 1. Bodies shorter than 200 characters (excerpt should contain full body)
 * 2. Bodies exactly 200 characters (excerpt should match body)
 * 3. Bodies longer than 200 characters (excerpt should be truncated to first 200
 *    chars)
 *
 * Process:
 *
 * 1. Create moderator and authenticate
 * 2. Create article category (required for article creation)
 * 3. Create member and authenticate
 * 4. Test short body scenario (< 200 chars)
 * 5. Test exact length scenario (= 200 chars)
 * 6. Test long body scenario (> 200 chars)
 */
export async function test_api_article_creation_excerpt_generation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category setup
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModeratorPass123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: "https://discussion-board.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion-board.example.com/" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category (required for articles)
  const categoryData = {
    name: "Technical Articles",
    slug: "technical-articles",
    description: "Category for testing excerpt generation functionality",
    sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecureMemberPass123!";

  const memberData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "192.168.1.101",
    href: "https://discussion-board.example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion-board.example.com/" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Test Case 1: Short body content (< 200 characters)
  const shortBody =
    "This is a short article body that is less than 200 characters in total length for testing excerpt generation.";

  const shortBodyArticle = {
    title: "Short Article for Excerpt Test",
    body: shortBody,
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdShortArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: shortBodyArticle,
    });
  typia.assert(createdShortArticle);

  // Validate short body excerpt generation
  TestValidator.predicate(
    "short body article should have excerpt populated",
    createdShortArticle.excerpt !== null &&
      createdShortArticle.excerpt !== undefined,
  );

  TestValidator.equals(
    "short body excerpt should equal full body content",
    createdShortArticle.excerpt,
    shortBody,
  );

  // Test Case 2: Exact 200 character body
  const exactBody = "A".repeat(200);

  const exactBodyArticle = {
    title: "Exact 200 Character Article",
    body: exactBody,
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdExactArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: exactBodyArticle,
    });
  typia.assert(createdExactArticle);

  // Validate exact length excerpt generation
  TestValidator.predicate(
    "exact length article should have excerpt populated",
    createdExactArticle.excerpt !== null &&
      createdExactArticle.excerpt !== undefined,
  );

  TestValidator.equals(
    "exact 200 char excerpt should match full body",
    createdExactArticle.excerpt,
    exactBody,
  );

  TestValidator.equals(
    "exact length excerpt should be 200 characters",
    (createdExactArticle.excerpt ?? "").length,
    200,
  );

  // Test Case 3: Long body content (> 200 characters)
  const longBody =
    "B".repeat(150) +
    "This part exceeds 200 characters when combined with the previous content and should be truncated in the excerpt field.";

  const longBodyArticle = {
    title: "Long Article for Excerpt Truncation Test",
    body: longBody,
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdLongArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: longBodyArticle,
    });
  typia.assert(createdLongArticle);

  // Validate long body excerpt truncation
  TestValidator.predicate(
    "long body article should have excerpt populated",
    createdLongArticle.excerpt !== null &&
      createdLongArticle.excerpt !== undefined,
  );

  TestValidator.equals(
    "long body excerpt should be truncated to 200 characters",
    (createdLongArticle.excerpt ?? "").length,
    200,
  );

  TestValidator.equals(
    "long body excerpt should match first 200 chars of body",
    createdLongArticle.excerpt,
    longBody.substring(0, 200),
  );
}
