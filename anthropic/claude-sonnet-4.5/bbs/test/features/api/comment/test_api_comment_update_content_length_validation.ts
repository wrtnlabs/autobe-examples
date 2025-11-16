import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test comment update with various content lengths to validate the 2000
 * character maximum constraint.
 *
 * This test validates that the comment update API properly enforces content
 * length limits:
 *
 * - Minimum valid length (1 character)
 * - Maximum valid length (2000 characters)
 * - Invalid lengths exceeding the maximum (2001+ characters)
 *
 * Process:
 *
 * 1. Create and authenticate a member account
 * 2. Create an article to host the comment
 * 3. Create an initial comment
 * 4. Test updating with minimum valid length (1 character)
 * 5. Test updating with maximum valid length (2000 characters)
 * 6. Test updating with invalid length (2001 characters) - should fail
 * 7. Test updating with significantly exceeding length (3000 characters) - should
 *    fail
 */
export async function test_api_comment_update_content_length_validation(
  connection: api.IConnection,
) {
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  const initialCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const initialCommentData = {
    content: initialCommentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: initialCommentData,
      },
    );
  typia.assert(comment);

  const minLengthContent = "a";
  const minLengthUpdate = {
    content: minLengthContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedCommentMin: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: minLengthUpdate,
      },
    );
  typia.assert(updatedCommentMin);
  TestValidator.equals(
    "minimum length update succeeded",
    updatedCommentMin.content,
    minLengthContent,
  );

  const maxLengthContent = ArrayUtil.repeat(2000, (i) =>
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz"]),
  ).join("");
  const maxLengthUpdate = {
    content: maxLengthContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedCommentMax: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: maxLengthUpdate,
      },
    );
  typia.assert(updatedCommentMax);
  TestValidator.equals(
    "maximum length update succeeded",
    updatedCommentMax.content,
    maxLengthContent,
  );
  TestValidator.predicate(
    "maximum length content is exactly 2000 characters",
    updatedCommentMax.content.length === 2000,
  );

  const exceedByOneContent = ArrayUtil.repeat(2001, (i) =>
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz"]),
  ).join("");
  await TestValidator.error(
    "content exceeding maximum by 1 should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: exceedByOneContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );

  const significantlyExceedContent = ArrayUtil.repeat(3000, (i) =>
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz"]),
  ).join("");
  await TestValidator.error(
    "content significantly exceeding maximum should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: significantlyExceedContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
