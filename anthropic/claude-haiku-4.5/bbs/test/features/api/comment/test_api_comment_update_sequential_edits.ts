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
 * Test multiple sequential updates to the same comment, verifying edit_count
 * increments correctly.
 *
 * This test validates the comment editing functionality by:
 *
 * 1. Creating contributor and moderator accounts
 * 2. Creating and publishing an article
 * 3. Posting an initial comment
 * 4. Performing three sequential updates to the same comment
 * 5. Verifying edit_count increments (1, 2, 3) with each update
 * 6. Verifying updated_at timestamp reflects each modification
 *
 * This ensures the edit history audit trail works correctly and tracks all
 * modifications.
 */
export async function test_api_comment_update_sequential_edits(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account and authenticate
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.predicate("contributor created", contributor.id !== null);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create article as contributor
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created", article.status === "draft");

  // Step 4: Switch to moderator and approve article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Article meets community guidelines",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article published",
    approvedArticle.status,
    "published",
  );

  // Step 5: Switch back to contributor for comment operations
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "SecurePass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 6: Create initial comment
  const initialComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  TestValidator.equals("initial edit_count is 0", initialComment.edit_count, 0);
  const initialUpdatedAt = initialComment.updated_at;

  // Step 7: First update to comment
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure timestamp difference
  const firstUpdate =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update edit_count is 1",
    firstUpdate.edit_count,
    1,
  );
  TestValidator.predicate(
    "updated_at changed after first update",
    firstUpdate.updated_at > initialUpdatedAt,
  );

  // Step 8: Second update to comment
  await new Promise((resolve) => setTimeout(resolve, 100));
  const secondUpdate =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update edit_count is 2",
    secondUpdate.edit_count,
    2,
  );
  TestValidator.predicate(
    "updated_at changed after second update",
    secondUpdate.updated_at > firstUpdate.updated_at,
  );

  // Step 9: Third update to comment
  await new Promise((resolve) => setTimeout(resolve, 100));
  const thirdUpdate =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  TestValidator.equals(
    "third update edit_count is 3",
    thirdUpdate.edit_count,
    3,
  );
  TestValidator.predicate(
    "updated_at changed after third update",
    thirdUpdate.updated_at > secondUpdate.updated_at,
  );

  // Step 10: Final validation - all edit_counts are correct
  TestValidator.equals(
    "final edit_count should be 3",
    thirdUpdate.edit_count,
    3,
  );
  TestValidator.predicate(
    "edit history progression correct",
    firstUpdate.edit_count === 1 &&
      secondUpdate.edit_count === 2 &&
      thirdUpdate.edit_count === 3,
  );
}
