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

export async function test_api_comment_update_unauthorized_member(
  connection: api.IConnection,
) {
  /**
   * Unauthorized comment update attempt by another authenticated member.
   *
   * Steps implemented:
   *
   * 1. Create member A (author) and member B (other member) via /auth/member/join
   *    using separate connection clones to maintain independent auth tokens.
   * 2. Member A creates an article and a comment on that article.
   * 3. Member B attempts to update the comment (expected to fail with
   *    authorization error).
   * 4. Member A performs a legitimate update to confirm the comment can be updated
   *    by the owner and to prove the unauthorized attempt did not modify the
   *    comment.
   */

  // 1) Prepare two isolated connections (token storage happens on the connection passed to the join call)
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 2) Register Member A (author)
  const memberAInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "http://example.com/author",
    referrer: "http://example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connA, { body: memberAInput });
  typia.assert(author);

  // 3) Member A creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connA, {
      body: articleBody,
    });
  typia.assert(article);

  // 4) Member A creates a comment on the article
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connA,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // Capture original state
  const originalContent: string = comment.content;
  const originalUpdatedAt: string = comment.updatedAt;

  // 5) Register Member B (attacker)
  const memberBInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "http://example.com/attacker",
    referrer: "http://example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const attacker: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connB, { body: memberBInput });
  typia.assert(attacker);

  // 6) Member B attempts to update the comment - MUST fail (ownership enforcement)
  await TestValidator.error(
    "other member cannot update someone else's comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.update(
        connB,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );

  // 7) Now, Member A (author) performs a legitimate update to confirm owner can update
  const newContentForAuthor = RandomGenerator.paragraph({ sentences: 4 });
  const authorUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connA,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: newContentForAuthor,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(authorUpdate);

  // 8) Validations
  // Ensure owner update changed updatedAt compared to original (demonstrating unauthorized update did not occur)
  TestValidator.predicate(
    "owner update changed updatedAt",
    new Date(authorUpdate.updatedAt).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Ensure the final content matches the author's update
  TestValidator.equals(
    "comment content updated by owner",
    authorUpdate.content,
    newContentForAuthor,
  );
}
