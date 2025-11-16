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
 * Public comment detail retrieval after authenticated creation.
 *
 * Business flow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join to obtain an
 *    authenticated context.
 * 2. As that member user, create a new article via POST
 *    /discussionBoard/memberUser/articles using a valid random categoryId (UUID
 *    format) and realistic random text fields.
 * 3. As the same member user, create a new comment for that article via POST
 *    /discussionBoard/memberUser/articles/{articleId}/comments.
 * 4. Derive a public (unauthenticated) connection by cloning the original
 *    connection with an empty headers object, without further header
 *    manipulation.
 * 5. Using the public connection, call GET
 *    /discussionBoard/articles/{articleId}/comments/{commentId}.
 * 6. Validate that the returned comment:
 *
 *    - Conforms to IDiscussionBoardComment (typia.assert).
 *    - Has the same id and body as the created comment.
 *    - Embeds an article summary whose id, title, and category.id match the created
 *         article.
 *    - Has a non-empty status string equal to the status from the created comment
 *         response.
 *    - Has deleted_at === null for this freshly created visible comment.
 */
export async function test_api_comment_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register member user and obtain authenticated context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(member);

  // 2. Create article as the authenticated member user
  const articleCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreate,
      },
    );
  typia.assert(article);

  // 3. Create comment for the article as the same member user
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreate,
      },
    );
  typia.assert(createdComment);

  // 4. Build a public (unauthenticated) connection by clearing headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Publicly fetch the comment detail
  const publicComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(
      publicConnection,
      {
        articleId: article.id,
        commentId: createdComment.id,
      },
    );
  typia.assert(publicComment);

  // 6. Validate logical consistency between created and public comment
  TestValidator.equals(
    "public comment id matches created comment id",
    publicComment.id,
    createdComment.id,
  );

  TestValidator.equals(
    "public comment body matches created comment body",
    publicComment.body,
    createdComment.body,
  );

  TestValidator.equals(
    "public comment status matches created comment status",
    publicComment.status,
    createdComment.status,
  );

  TestValidator.equals(
    "public comment article id matches created article id",
    publicComment.article.id,
    article.id,
  );

  TestValidator.equals(
    "public comment article title matches created article title",
    publicComment.article.title,
    article.title,
  );

  TestValidator.equals(
    "public comment article category id matches created article category id",
    publicComment.article.category.id,
    article.category.id,
  );

  TestValidator.equals(
    "public comment deleted_at is null for fresh comment",
    publicComment.deleted_at,
    null,
  );

  TestValidator.predicate(
    "public comment status is non-empty string",
    publicComment.status.length > 0,
  );
}
