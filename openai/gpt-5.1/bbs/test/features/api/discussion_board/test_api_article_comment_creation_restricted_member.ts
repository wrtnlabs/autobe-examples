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
 * Validate member-user comment creation on discussion board articles.
 *
 * This test exercises the happy-path flow where authenticated member users:
 *
 * - Register (join),
 * - Create an article,
 * - And post comments on that article using the memberUser comment API.
 *
 * The original business intent mentioned restriction-based blocking of comments
 * for certain users, but no restriction-management API is available in the
 * provided SDK. Therefore, this test focuses on what can be validated
 * end-to-end:
 *
 * 1. A freshly joined member user can create an article.
 * 2. The same member user can immediately post a comment on that article.
 * 3. A second, distinct member user can also post a comment on the same article.
 * 4. Both comments are correctly associated with the target article, and their
 *    bodies match what was sent in the request.
 */
export async function test_api_article_comment_creation_restricted_member(
  connection: api.IConnection,
) {
  // 1. First member joins the discussion board
  const firstJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const firstMember: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstMember);

  // 2. First member creates an article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. First member creates a comment on the article
  const firstCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const firstComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: firstCommentBody,
      },
    );
  typia.assert(firstComment);

  TestValidator.equals(
    "first comment should reference the created article",
    firstComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "first comment body should match request payload",
    firstComment.body,
    firstCommentBody.body,
  );

  // 4. Second member joins the discussion board
  const secondJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.2",
    href: "https://example.com/join",
    referrer: "https://example.com/ads",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const secondMember: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondJoinBody,
    });
  typia.assert(secondMember);

  // 5. Second member creates another comment on the same article
  const secondCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const secondComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: secondCommentBody,
      },
    );
  typia.assert(secondComment);

  TestValidator.equals(
    "second comment should reference the created article",
    secondComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "second comment body should match request payload",
    secondComment.body,
    secondCommentBody.body,
  );

  // 6. Cross-validate that both comments target the same article and members differ
  TestValidator.equals(
    "both comments should target the same article",
    firstComment.article.id,
    secondComment.article.id,
  );

  TestValidator.predicate(
    "first and second members must be distinct accounts",
    firstMember.id !== secondMember.id,
  );
}
