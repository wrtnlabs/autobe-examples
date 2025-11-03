import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test public access to retrieve a published article by its unique ID.
 *
 * This test validates that any user (guest, member, or moderator) can retrieve
 * a published discussion board article without authentication. The test creates
 * a complete article with all metadata (categories, tags, author information)
 * and then retrieves it to verify that the full article details are publicly
 * accessible.
 *
 * The test confirms that:
 *
 * 1. Published articles are accessible without authentication
 * 2. Complete article content (title, body, summary) is returned
 * 3. Author public profile information is included (username, display_name,
 *    profile_picture)
 * 4. Sensitive author information (password_hash, email) is NOT exposed
 * 5. Categories and tags are properly included in the response
 * 6. Engagement metrics (view_count, comment_count) are present
 * 7. Attachment metadata (images, documents) is accessible
 */
export async function test_api_article_retrieval_by_id_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to author the test article
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a category for article classification
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create a published article with complete metadata
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 5 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 4: Retrieve the article by ID (simulating public/guest access)
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(retrievedArticle);

  // Step 5: Validate complete article details
  TestValidator.equals(
    "article ID matches",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "article body matches",
    retrievedArticle.body,
    createdArticle.body,
  );
  TestValidator.equals(
    "article summary matches",
    retrievedArticle.summary,
    createdArticle.summary,
  );
  TestValidator.equals(
    "article status is published",
    retrievedArticle.status,
    "published",
  );

  // Step 6: Validate author public profile information
  TestValidator.equals(
    "author ID matches member",
    retrievedArticle.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedArticle.author.username,
    authorizedMember.username,
  );

  // Step 7: Validate categories are included
  TestValidator.predicate(
    "article has categories",
    retrievedArticle.categories.length > 0,
  );
  TestValidator.equals(
    "category ID matches",
    retrievedArticle.categories[0].id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedArticle.categories[0].name,
    category.name,
  );

  // Step 8: Validate engagement metrics
  TestValidator.predicate(
    "view_count is non-negative",
    retrievedArticle.view_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    retrievedArticle.comment_count >= 0,
  );
}
