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
 * Validate edit_count tracking on comment retrieval.
 *
 * Tests that the edit_count field is properly incremented and returned when
 * retrieving a comment that has been edited multiple times. This validates the
 * audit trail functionality for tracking comment modification history.
 *
 * Workflow:
 *
 * 1. Create contributor account
 * 2. Create article in draft status
 * 3. Create moderator account
 * 4. Have moderator approve and publish the article
 * 5. Have contributor post a comment on the article
 * 6. Retrieve comment and verify edit_count=0 (initial state)
 * 7. Update the comment content (first edit)
 * 8. Retrieve comment and verify edit_count=1
 * 9. Update the comment again (second edit)
 * 10. Retrieve comment and verify edit_count=2
 */
export async function test_api_comment_retrieval_edit_count_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPassword123!";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(10),
      password: contributorPassword,
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created",
    () => contributor.id !== undefined,
  );

  // Step 2: Create article in draft status
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Comment Edit Tracking",
          content:
            "This is the initial article content for testing comment edits.",
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost/articles/create",
          referrer: "http://localhost/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created in draft status",
    () => article.status === "draft",
  );

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPassword123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Switch to moderator and approve the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost/moderator/login",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Article approved for publication",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article status is published",
    approvedArticle.status,
    "published",
  );

  // Step 5: Switch back to contributor and create a comment
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost/contributor/login",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is the initial comment content.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Retrieve comment and verify edit_count=0 (newly created)
  let retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  TestValidator.equals(
    "new comment has edit_count=0",
    retrievedComment.edit_count,
    0,
  );

  // Step 7: Update the comment (first edit)
  const updatedComment1 =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: "This is the updated comment content after first edit.",
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment1);

  // Step 8: Retrieve comment and verify edit_count=1
  retrievedComment = await api.functional.discussionBoard.articles.comments.at(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "comment has edit_count=1 after first edit",
    retrievedComment.edit_count,
    1,
  );

  // Step 9: Update the comment again (second edit)
  const updatedComment2 =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: "This is the updated comment content after second edit.",
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment2);

  // Step 10: Retrieve comment and verify edit_count=2
  retrievedComment = await api.functional.discussionBoard.articles.comments.at(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "comment has edit_count=2 after second edit",
    retrievedComment.edit_count,
    2,
  );

  // Verify the content reflects the latest update
  TestValidator.equals(
    "comment content reflects latest update",
    retrievedComment.content,
    "This is the updated comment content after second edit.",
  );
}
