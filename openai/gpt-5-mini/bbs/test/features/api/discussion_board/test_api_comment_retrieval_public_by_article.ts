import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_comment_retrieval_public_by_article(
  connection: api.IConnection,
) {
  // 1) Member registration (join)
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    // Password satisfies length and includes categories (upper/lower/digit/symbol)
    password: `Aa1!${RandomGenerator.alphaNumeric(9)}`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create a comment under the article
  const commentBody = {
    content: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 4) Public (unauthenticated) retrieval: create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const publicComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(unauthConn, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(publicComment);

  // Business validations
  TestValidator.equals(
    "public comment id matches created comment",
    publicComment.id,
    comment.id,
  );

  TestValidator.equals(
    "public comment content matches created content",
    publicComment.content,
    comment.content,
  );

  // typia.assert already validated types (including createdAt). Additional
  // business predicates below check presence/shape and omission of sensitive
  // fields in the public JSON payload.
  TestValidator.predicate(
    "public comment has createdAt",
    publicComment.createdAt !== null && publicComment.createdAt !== undefined,
  );

  // Author may be anonymized (null) depending on server policy. If present,
  // assert its shape; if null, accept it as a valid anonymized author.
  if (publicComment.author !== null && publicComment.author !== undefined) {
    typia.assert(publicComment.author);
    TestValidator.predicate(
      "author summary contains id",
      typeof publicComment.author.id === "string" &&
        publicComment.author.id.length > 0,
    );
    TestValidator.predicate(
      "author summary contains username",
      typeof publicComment.author.username === "string" &&
        publicComment.author.username.length > 0,
    );
  } else {
    // Accept anonymized author: no further author-specific assertions
    TestValidator.predicate("author is anonymized or absent", true);
  }

  // Ensure sensitive fields like 'email' are not present in public payload (basic leakage check)
  TestValidator.predicate(
    "public response does not contain sensitive 'email' field",
    !JSON.stringify(publicComment).includes('"email"'),
  );

  // Negative scenarios: non-existent comment under same article and mismatched articleId
  await TestValidator.error(
    "non-existent comment id under existing article yields error",
    async () => {
      await api.functional.discussionBoard.articles.comments.at(unauthConn, {
        articleId: article.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  await TestValidator.error(
    "existing comment id with mismatched articleId yields error",
    async () => {
      await api.functional.discussionBoard.articles.comments.at(unauthConn, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        commentId: comment.id,
      });
    },
  );
}
