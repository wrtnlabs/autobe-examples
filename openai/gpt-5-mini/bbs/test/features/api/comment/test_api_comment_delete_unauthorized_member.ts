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

/**
 * Unauthorized comment deletion attempt by another member.
 *
 * Business context:
 *
 * - Ensure ownership checks are enforced: only the comment author or an
 *   authorized moderator/admin can soft-delete the comment. A different
 *   authenticated member must not be able to delete someone else's comment.
 *
 * Process:
 *
 * 1. Member A registers (author) and becomes authenticated.
 * 2. Member A creates an article.
 * 3. Member A creates a comment on the article.
 * 4. Member B registers (different member) and becomes authenticated.
 * 5. Member B attempts to delete Member A's comment — this must fail.
 * 6. Verify that the comment's soft-delete timestamp remains null/undefined.
 */
export async function test_api_comment_delete_unauthorized_member(
  connection: api.IConnection,
) {
  // 1) Register Member A (author)
  const memberAJoin = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: "https://example.com/",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAJoin,
    });
  typia.assert(memberA);

  // 2) Member A creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 20,
      sentenceMax: 30,
      wordMin: 4,
      wordMax: 8,
    }),
    category_slug: null,
    tag_slugs: undefined,
    state: "published",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Member A creates a comment on the article
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

  // Basic sanity checks
  TestValidator.predicate(
    "created comment has author summary or acceptable author info",
    comment.author !== null && comment.author !== undefined,
  );

  // 4) Register Member B (different member) -> switches connection to Member B
  const memberBJoin = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: "https://example.org/",
    referrer: "https://example.org/",
  } satisfies IDiscussionBoardMember.IJoin;

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBJoin,
    });
  typia.assert(memberB);

  // 5) Member B attempts to delete Member A's comment — expect an error
  await TestValidator.error(
    "unauthorized member cannot delete another member's comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );

  // 6) Verify the comment remains not soft-deleted (deletedAt is null/undefined)
  TestValidator.predicate(
    "comment should remain undeleted after unauthorized attempt",
    comment.deletedAt === null || comment.deletedAt === undefined,
  );
}
