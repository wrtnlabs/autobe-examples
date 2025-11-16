import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that article author attribution is correctly extracted from JWT
 * authentication token and cannot be manipulated through request body.
 *
 * This test validates the critical security principle that author identity
 * (discussion_board_member_id) is automatically extracted from the JWT token
 * and properly associated with the created article.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account via join endpoint
 * 2. Use the authenticated connection to create an article
 * 3. Verify the returned article has correct author attribution matching the
 *    authenticated member
 * 4. Validate that author information includes all expected member details
 */
export async function test_api_article_author_attribution_from_jwt_token(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create an article using the authenticated connection
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Verify the article has correct author attribution from JWT token
  TestValidator.equals(
    "article author ID matches authenticated member",
    createdArticle.author.id,
    authenticatedMember.id,
  );

  TestValidator.equals(
    "article author username matches authenticated member",
    createdArticle.author.username,
    authenticatedMember.username,
  );

  TestValidator.equals(
    "article author email matches authenticated member",
    createdArticle.author.email,
    authenticatedMember.email,
  );

  // Validate article content matches what was submitted
  TestValidator.equals(
    "article title matches submitted data",
    createdArticle.title,
    articleData.title,
  );

  TestValidator.equals(
    "article body matches submitted data",
    createdArticle.body,
    articleData.body,
  );

  // Validate article metadata is properly initialized
  TestValidator.equals(
    "article view count initialized to zero",
    createdArticle.view_count,
    0,
  );

  TestValidator.equals(
    "article is not deleted",
    createdArticle.deleted_at,
    null,
  );
}
