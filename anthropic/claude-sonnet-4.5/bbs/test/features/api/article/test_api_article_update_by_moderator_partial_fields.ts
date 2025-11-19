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
 * Test moderator's ability to perform partial updates by modifying only
 * specific fields while leaving others unchanged.
 *
 * This scenario creates a category, creates a member who publishes an article,
 * then authenticates as a moderator and updates only the title field without
 * changing body, category, or status. The test verifies that only the specified
 * field is updated, other fields remain unchanged, the updated_at timestamp is
 * refreshed, and the is_edited flag is set appropriately. This validates the
 * partial update capability and ensures unnecessary field modifications don't
 * occur.
 *
 * Steps:
 *
 * 1. Create moderator account
 * 2. Create article category
 * 3. Create member account
 * 4. Member creates a published article
 * 5. Switch to moderator authentication
 * 6. Moderator performs partial update (only title)
 * 7. Validate only title changed, other fields unchanged, is_edited flag set,
 *    updated_at refreshed
 */
export async function test_api_article_update_by_moderator_partial_fields(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";
  const testHref = "https://test.example.com/article-update";
  const testReferrer = "https://test.example.com/";

  const moderatorData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    href: testHref,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  const categoryData = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description: "Discussion about economic topics",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  const memberData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    href: testHref,
    referrer: testReferrer,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });

  const articleData = {
    title: originalTitle,
    body: originalBody,
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  TestValidator.equals(
    "article title matches original",
    article.title,
    originalTitle,
  );
  TestValidator.equals(
    "article body matches original",
    article.body,
    originalBody,
  );
  TestValidator.equals(
    "article category matches",
    article.category.id,
    category.id,
  );
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );

  const originalUpdatedAt = article.updated_at;

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: testHref,
      referrer: testReferrer,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const newTitle = RandomGenerator.paragraph({ sentences: 3 });

  const updateData = {
    title: newTitle,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: article.id,
      body: updateData,
    });
  typia.assert(updatedArticle);

  TestValidator.equals(
    "article title was updated",
    updatedArticle.title,
    newTitle,
  );
  TestValidator.notEquals(
    "article title changed from original",
    updatedArticle.title,
    originalTitle,
  );

  TestValidator.equals(
    "article body unchanged",
    updatedArticle.body,
    originalBody,
  );
  TestValidator.equals(
    "article category unchanged",
    updatedArticle.category.id,
    category.id,
  );
  TestValidator.equals(
    "article status unchanged",
    updatedArticle.status,
    "published",
  );

  TestValidator.equals(
    "is_edited flag set to true",
    updatedArticle.is_edited,
    true,
  );

  TestValidator.notEquals(
    "updated_at timestamp was refreshed",
    updatedArticle.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals("article ID unchanged", updatedArticle.id, article.id);
  TestValidator.equals(
    "article author unchanged",
    updatedArticle.author.id,
    member.id,
  );
}
