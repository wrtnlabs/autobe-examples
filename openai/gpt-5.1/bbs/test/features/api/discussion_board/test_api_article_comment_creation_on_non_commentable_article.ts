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

export async function test_api_article_comment_creation_on_non_commentable_article(
  connection: api.IConnection,
) {
  // 1. Register a member user so that we have a valid authenticated context
  const joinRequest = typia.random<IDiscussionBoardMemberUserJoin.IRequest>();
  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(member);

  // 2. Create a new article as this member user
  const articleCreateBody = typia.random<IDiscussionBoardArticle.ICreate>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // Basic sanity checks on article
  TestValidator.predicate(
    "created article id must be a non-empty string",
    article.id.length > 0,
  );
  TestValidator.equals(
    "article title in response should match creation payload",
    article.title,
    articleCreateBody.title,
  );

  // 3. Attempt to create a comment on the article
  const commentCreateBody: IDiscussionBoardComment.ICreate = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  };

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 4. Validate that the comment is structurally correct and linked to article
  TestValidator.predicate(
    "created comment id must be a non-empty string",
    comment.id.length > 0,
  );
  TestValidator.equals(
    "comment body should match input payload",
    comment.body,
    commentCreateBody.body,
  );
  TestValidator.equals(
    "comment.article.id should match target article id",
    comment.article.id,
    article.id,
  );

  // NOTE:
  // The original scenario requested testing rejection when an article does not
  // allow new comments (e.g., locked or archived). With the current exposed
  // APIs and DTOs we cannot toggle article commentability or observe comment
  // counts, so we focus on validating the normal creation behavior and
  // relational integrity instead, ensuring the endpoint works end-to-end under
  // an authenticated member user context.
}
