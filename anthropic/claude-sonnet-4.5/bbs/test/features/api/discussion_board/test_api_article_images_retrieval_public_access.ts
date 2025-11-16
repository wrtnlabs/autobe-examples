import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";

/**
 * Test public access to retrieve a paginated list of images attached to an
 * article.
 *
 * This test validates that anyone (including unauthenticated users) can view
 * article images, supporting the discussion board's open content model where
 * visual supporting materials enhance economic and political discussions.
 *
 * Workflow:
 *
 * 1. A member joins the platform and authenticates
 * 2. The member creates a discussion article
 * 3. Retrieve the paginated list of images for the article (no authentication
 *    required)
 * 4. Validate pagination metadata (current page, limit, total records, total
 *    pages)
 * 5. Validate image summary structure includes all required fields
 */
export async function test_api_article_images_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Member joins and authenticates
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Member creates a discussion article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create an unauthenticated connection for public access testing
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve article images with pagination (public access - no authentication)
  const imageRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const imageResponse: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(
      publicConnection,
      {
        articleId: article.id,
        body: imageRequest,
      },
    );
  typia.assert(imageResponse);

  // Step 5: Validate pagination metadata structure
  TestValidator.equals(
    "current page should match request",
    imageResponse.pagination.current,
    imageRequest.page,
  );

  TestValidator.equals(
    "limit should match request",
    imageResponse.pagination.limit,
    imageRequest.limit,
  );

  TestValidator.predicate(
    "total records must be non-negative",
    imageResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages must be non-negative",
    imageResponse.pagination.pages >= 0,
  );

  // Step 6: Validate response data array exists (typia.assert already validated the complete structure)
  TestValidator.predicate(
    "response data array must exist",
    Array.isArray(imageResponse.data),
  );
}
