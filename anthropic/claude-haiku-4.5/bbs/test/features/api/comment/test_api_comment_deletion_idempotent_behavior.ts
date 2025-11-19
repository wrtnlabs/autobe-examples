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
 * Test idempotent behavior of comment deletion.
 *
 * Validates that deleting an already-deleted comment returns success (HTTP 200)
 * rather than a 404 error, demonstrating idempotent behavior.
 *
 * Process:
 *
 * 1. Create contributor account via authentication
 * 2. Create an article with the contributor
 * 3. Post a comment on the article
 * 4. Delete the comment successfully (first deletion)
 * 5. Attempt to delete the same comment again (second deletion)
 * 6. Verify both deletions succeed and return consistent responses
 */
export async function test_api_comment_deletion_idempotent_behavior(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 7,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Post a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.predicate(
    "comment should not be deleted initially",
    comment.is_deleted === false,
  );

  // Step 4: Delete the comment for the first time
  const firstDeletion: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(firstDeletion);
  TestValidator.predicate(
    "first deletion should mark comment as deleted",
    firstDeletion.is_deleted === true,
  );
  TestValidator.equals(
    "deleted_at should be set after first deletion",
    firstDeletion.deleted_at !== undefined && firstDeletion.deleted_at !== null,
    true,
  );

  // Step 5: Delete the same comment again (idempotent operation)
  const secondDeletion: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(secondDeletion);

  // Step 6: Verify idempotent behavior
  TestValidator.predicate(
    "second deletion should also mark comment as deleted",
    secondDeletion.is_deleted === true,
  );
  TestValidator.equals(
    "second deletion should return same deleted state",
    secondDeletion.id,
    firstDeletion.id,
  );
  TestValidator.equals(
    "deleted_at timestamp should be consistent",
    secondDeletion.deleted_at,
    firstDeletion.deleted_at,
  );
  TestValidator.predicate(
    "idempotent deletion should succeed without error",
    true,
  );
}
