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

export async function test_api_comment_detail_visibility_and_not_found_cases(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    // Optional fields can be null or omitted; use realistic sample values where convenient
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    location: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a new article as this member
  const articleCreateBody = typia.random<IDiscussionBoardArticle.ICreate>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Create two comments on this article
  const firstCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
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

  const secondCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
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

  // 4. Prepare an unauthenticated connection for public access
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Publicly get comment detail for the first comment
  const publicFirst: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(
      publicConnection,
      {
        articleId: article.id,
        commentId: firstComment.id,
      },
    );
  typia.assert(publicFirst);

  TestValidator.equals(
    "public fetch of first comment returns same id",
    publicFirst.id,
    firstComment.id,
  );
  TestValidator.equals(
    "public fetch of first comment belongs to same article",
    publicFirst.article.id,
    article.id,
  );

  // 6. Publicly get comment detail for the second comment
  const publicSecond: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(
      publicConnection,
      {
        articleId: article.id,
        commentId: secondComment.id,
      },
    );
  typia.assert(publicSecond);

  TestValidator.equals(
    "public fetch of second comment returns same id",
    publicSecond.id,
    secondComment.id,
  );
  TestValidator.equals(
    "public fetch of second comment belongs to same article",
    publicSecond.article.id,
    article.id,
  );

  // 7. Cross-article mismatch should not be found
  const secondArticleBody = typia.random<IDiscussionBoardArticle.ICreate>();
  const secondArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: secondArticleBody,
      },
    );
  typia.assert(secondArticle);

  const crossCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const crossArticleComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: secondArticle.id,
        body: crossCommentBody,
      },
    );
  typia.assert(crossArticleComment);

  await TestValidator.error(
    "cross-article articleId/commentId pair should not be retrievable",
    async () => {
      await api.functional.discussionBoard.articles.comments.at(
        publicConnection,
        {
          articleId: article.id,
          commentId: crossArticleComment.id,
        },
      );
    },
  );

  // 8. Random non-existing UUIDs should also result in error
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "random non-existing articleId/commentId should result in error",
    async () => {
      await api.functional.discussionBoard.articles.comments.at(
        publicConnection,
        {
          articleId: randomArticleId,
          commentId: randomCommentId,
        },
      );
    },
  );
}
