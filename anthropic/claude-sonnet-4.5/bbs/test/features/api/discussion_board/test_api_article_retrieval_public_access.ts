import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test public access to retrieve discussion board article details.
 *
 * This test validates that any user (including unauthenticated guests) can
 * retrieve a published article's complete details from the discussion board.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create an article as the authenticated member
 * 3. Retrieve the article without authentication (as a guest)
 * 4. Validate the complete article data including author information
 * 5. Verify view count increments from 0 to 1
 * 6. Ensure content matches the original article
 */
export async function test_api_article_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create an article as the authenticated member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Verify initial article state
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article body matches",
    createdArticle.body,
    articleData.body,
  );
  TestValidator.equals("initial view count is 0", createdArticle.view_count, 0);
  TestValidator.equals(
    "article is not deleted",
    createdArticle.deleted_at,
    null,
  );

  // Step 3: Retrieve the article without authentication (as a guest)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(
      unauthenticatedConnection,
      {
        articleId: createdArticle.id,
      },
    );
  typia.assert(retrievedArticle);

  // Step 4: Validate complete article data
  TestValidator.equals(
    "retrieved article ID matches",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "retrieved article title matches",
    retrievedArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "retrieved article body matches",
    retrievedArticle.body,
    articleData.body,
  );
  TestValidator.equals(
    "article deleted_at is null",
    retrievedArticle.deleted_at,
    null,
  );

  // Step 5: Verify view count incremented to 1
  TestValidator.equals(
    "view count incremented to 1",
    retrievedArticle.view_count,
    1,
  );

  // Step 6: Validate author information is complete
  TestValidator.equals(
    "author ID matches member",
    retrievedArticle.author.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedArticle.author.username,
    authenticatedMember.username,
  );
  TestValidator.equals(
    "author email matches",
    retrievedArticle.author.email,
    authenticatedMember.email,
  );
  TestValidator.equals(
    "author status matches",
    retrievedArticle.author.status,
    authenticatedMember.status,
  );
  TestValidator.equals(
    "author email_verified matches",
    retrievedArticle.author.email_verified,
    authenticatedMember.email_verified,
  );
  TestValidator.equals(
    "author created_at matches",
    retrievedArticle.author.created_at,
    authenticatedMember.created_at,
  );
}
