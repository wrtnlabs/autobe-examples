import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that a member user can create an article and then post a comment on
 * it.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new discussion board member user via /auth/memberUser/join.
 * 2. As that authenticated member, create an article via
 *    /discussionBoard/memberUser/articles.
 * 3. As the same member, create a comment for the article via
 *    /discussionBoard/memberUser/articles/{articleId}/comments.
 * 4. Verify that the created comment reflects the request payload and is linked to
 *    the correct article summary.
 * 5. Verify that attempting to create a comment without authentication fails.
 */
export async function test_api_article_comment_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized session
  const joinRequest = typia.random<IDiscussionBoardMemberUserJoin.IRequest>();

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(member);

  // 2. Create a new article as the authenticated member user
  const articleRequest = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    // In a real environment this should reference an existing category.
    // Here we use a random UUID; backend fixtures/config must ensure validity.
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleRequest,
      },
    );
  typia.assert(article);

  // Basic sanity checks on the created article
  TestValidator.equals(
    "article title should match request",
    article.title,
    articleRequest.title,
  );
  TestValidator.equals(
    "article body should match request",
    article.body,
    articleRequest.body,
  );

  // 3. Create a comment on the article as the same member user
  const commentRequest = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentRequest,
      },
    );
  typia.assert(comment);

  // 4. Validate the created comment
  TestValidator.equals(
    "comment body should match request body",
    comment.body,
    commentRequest.body,
  );

  // Ensure the comment is linked to the correct article summary
  TestValidator.equals(
    "comment.article.id should match parent article id",
    comment.article.id,
    article.id,
  );

  // author_type should be a non-empty string, but we don't rely on a specific enum
  TestValidator.predicate(
    "comment author_type should be a non-empty string",
    typeof comment.author_type === "string" && comment.author_type.length > 0,
  );

  // Timestamps should be present; typia.assert has already validated date-time format
  TestValidator.predicate(
    "comment.created_at should be a non-empty string",
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment.updated_at should be a non-empty string",
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );

  // 5. Negative test: creating a comment without authentication must fail
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated comment creation should fail",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.comments.create(
        anonymousConnection,
        {
          articleId: article.id,
          body: commentRequest,
        },
      );
    },
  );
}
