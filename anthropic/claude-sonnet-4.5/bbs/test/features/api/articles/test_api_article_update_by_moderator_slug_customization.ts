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
 * Test moderator's ability to update an article's URL slug for custom URL
 * management and SEO purposes.
 *
 * This test validates a multi-actor workflow where a moderator customizes an
 * article slug:
 *
 * 1. Create and authenticate moderator account for slug customization privileges
 * 2. Create category for article classification
 * 3. Create member account to author the article
 * 4. Member publishes article with auto-generated slug
 * 5. Switch to moderator authentication
 * 6. Moderator updates article with custom slug
 * 7. Validate slug update success and data integrity
 *
 * Ensures moderators can correct problematic slugs or optimize URLs for better
 * discoverability.
 */
export async function test_api_article_update_by_moderator_slug_customization(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_pass_123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category for article classification
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "SEO Test Category",
          slug: "seo-test-category",
          description: "Category for testing slug customization",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to author the article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_pass_123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates article with auto-generated slug
  const articleTitle = "Economic Analysis of Market Trends in 2024";
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 10,
  });

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Validate article was created with auto-generated slug
  TestValidator.predicate(
    "article should have auto-generated slug",
    createdArticle.slug.length > 0,
  );

  const originalSlug = createdArticle.slug;

  // Step 5: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Moderator updates article with custom slug
  const customSlug = "economic-analysis-market-trends-2024-optimized";

  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        slug: customSlug,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 7: Validate slug update and data integrity
  TestValidator.equals(
    "slug should be updated to custom value",
    updatedArticle.slug,
    customSlug,
  );

  TestValidator.notEquals(
    "new slug should differ from original",
    updatedArticle.slug,
    originalSlug,
  );

  TestValidator.predicate(
    "article should be marked as edited",
    updatedArticle.is_edited === true,
  );

  TestValidator.equals(
    "article ID should remain unchanged",
    updatedArticle.id,
    createdArticle.id,
  );

  TestValidator.equals(
    "article title should remain unchanged",
    updatedArticle.title,
    createdArticle.title,
  );

  TestValidator.equals(
    "article body should remain unchanged",
    updatedArticle.body,
    createdArticle.body,
  );

  TestValidator.equals(
    "category should remain unchanged",
    updatedArticle.category.id,
    category.id,
  );

  TestValidator.predicate(
    "updated_at timestamp should be updated",
    new Date(updatedArticle.updated_at).getTime() >=
      new Date(createdArticle.updated_at).getTime(),
  );

  TestValidator.predicate(
    "custom slug should be URL-friendly",
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(updatedArticle.slug),
  );
}
