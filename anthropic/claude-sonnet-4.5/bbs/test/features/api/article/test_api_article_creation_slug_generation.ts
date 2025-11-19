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
 * Test automatic slug generation from article titles to ensure URL-friendly
 * identifiers are created correctly.
 *
 * This test validates that:
 *
 * 1. Slugs are automatically generated from article titles
 * 2. Titles with spaces are converted to lowercase with hyphens
 * 3. Uppercase letters are converted to lowercase
 * 4. Multiple words are properly joined with hyphens
 * 5. Generated slugs are URL-safe and follow consistent formatting rules
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category for testing
 * 3. Create member account and authenticate
 * 4. Create articles with various title formats
 * 5. Verify each slug is properly formatted and URL-friendly
 */
export async function test_api_article_creation_slug_generation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for slug generation testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Test slug generation with various title formats
  const testCases = [
    {
      title: "Simple Title With Spaces",
      expectedSlugPattern: /^simple-title-with-spaces$/,
      description: "Title with spaces should convert to hyphens",
    },
    {
      title: "UPPERCASE TITLE",
      expectedSlugPattern: /^uppercase-title$/,
      description: "Uppercase letters should convert to lowercase",
    },
    {
      title: "Mixed Case Title Example",
      expectedSlugPattern: /^mixed-case-title-example$/,
      description: "Mixed case should convert to lowercase with hyphens",
    },
    {
      title: "Multiple   Spaces   Between   Words",
      expectedSlugPattern: /^multiple-spaces-between-words$/,
      description: "Multiple spaces should be normalized to single hyphens",
    },
  ];

  const createdArticles = [];

  for (const testCase of testCases) {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: testCase.title,
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);

    // Validate slug was generated
    TestValidator.predicate(
      `${testCase.description} - slug should be generated`,
      article.slug !== null &&
        article.slug !== undefined &&
        article.slug.length > 0,
    );

    // Validate slug is lowercase
    TestValidator.predicate(
      `${testCase.description} - slug should be lowercase`,
      article.slug === article.slug.toLowerCase(),
    );

    // Validate slug matches expected pattern
    TestValidator.predicate(
      `${testCase.description} - slug matches expected pattern`,
      testCase.expectedSlugPattern.test(article.slug),
    );

    // Validate slug is URL-safe (only lowercase letters, numbers, and hyphens)
    TestValidator.predicate(
      `${testCase.description} - slug should be URL-safe`,
      /^[a-z0-9-]+$/.test(article.slug),
    );

    // Validate title matches what was sent
    TestValidator.equals(
      `${testCase.description} - title should match input`,
      article.title,
      testCase.title,
    );

    createdArticles.push(article);
  }

  // Step 5: Verify all generated slugs are unique
  const slugs = createdArticles.map((a) => a.slug);
  const uniqueSlugs = new Set(slugs);
  TestValidator.predicate(
    "all generated slugs should be unique",
    slugs.length === uniqueSlugs.size,
  );

  // Step 6: Verify each slug corresponds to its article
  for (const article of createdArticles) {
    TestValidator.predicate(
      `article ${article.id} should have non-empty slug`,
      article.slug.length > 0,
    );

    TestValidator.predicate(
      `article ${article.id} slug should not contain spaces`,
      !article.slug.includes(" "),
    );
  }
}
