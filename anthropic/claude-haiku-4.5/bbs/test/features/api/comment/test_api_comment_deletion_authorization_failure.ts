import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that a contributor cannot delete another contributor's comment,
 * validating authorization enforcement.
 *
 * Contributor A creates an article and posts a comment. Contributor B attempts
 * to delete Contributor A's comment without moderator privileges. The operation
 * should return HTTP 403 Forbidden, confirming that contributors can only
 * delete their own comments. This validates the system's access control for
 * comment ownership.
 *
 * Test workflow:
 *
 * 1. Contributor A joins the discussion board
 * 2. Contributor A creates an article
 * 3. Contributor A posts a comment on the article
 * 4. Contributor B joins the discussion board
 * 5. Contributor B attempts to delete Contributor A's comment
 * 6. Verify HTTP 403 Forbidden is returned
 */
export async function test_api_comment_deletion_authorization_failure(
  connection: api.IConnection,
) {
  // Step 1: Create Contributor A (comment author)
  const contributorAEmail = typia.random<string & tags.Format<"email">>();
  const contributorA = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorAEmail,
      username: RandomGenerator.name(1),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributorA);

  // Step 2: Contributor A creates an article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Contributor A posts a comment on the article
  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Create Contributor B (unauthorized deleter)
  const contributorBEmail = typia.random<string & tags.Format<"email">>();
  const contributorB = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorBEmail,
      username: RandomGenerator.name(1),
      password: "SecurePass456!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributorB);

  // Step 5 & 6: Contributor B attempts to delete Contributor A's comment
  // Verify HTTP 403 Forbidden is returned
  await TestValidator.httpError(
    "contributor cannot delete another contributor's comment",
    403,
    async () => {
      return await api.functional.discussionBoard.contributor.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );
}
