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

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1) Register a new member (member A) and authenticate
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    username,
    email,
    password: "Str0ngP@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article as member A
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create a comment on the article as member A
  const commentBody = {
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 7,
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

  // Record pre-update timestamp
  const preUpdatedAt = comment.updatedAt;

  // 4) Update the comment's content as the same authenticated member
  const newContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 9,
  });
  const updateBody = {
    content: newContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updated: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5) Business validations
  // a) Content persisted
  TestValidator.equals(
    "updated comment content is persisted",
    updated.content,
    newContent,
  );

  // b) updatedAt increased
  TestValidator.predicate(
    "updatedAt is newer after update",
    Date.parse(updated.updatedAt) > Date.parse(preUpdatedAt),
  );

  // c) Comment remains associated with the same article
  TestValidator.equals(
    "article association remains",
    updated.articleId,
    article.id,
  );

  // d) Ownership: author id equals member id
  if (!updated.author) throw new Error("Author must be present after update");
  const author = typia.assert(updated.author);
  TestValidator.equals("comment author matches creator", author.id, member.id);

  // e) Sensitive fields not exposed in author summary (validate keys)
  const authorKeys = Object.keys(author);
  TestValidator.predicate(
    "author summary does not expose sensitive fields",
    !authorKeys.includes("email") && !authorKeys.includes("password_hash"),
  );
}
