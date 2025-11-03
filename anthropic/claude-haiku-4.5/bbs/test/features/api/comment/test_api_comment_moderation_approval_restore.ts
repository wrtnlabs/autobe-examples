import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator workflow for approving and restoring a previously flagged
 * comment.
 *
 * This test validates the complete comment moderation lifecycle including
 * setup, content creation, moderation review, and validation of the approval
 * action. The workflow demonstrates how moderators review comments and restore
 * them to published status, making them visible to all users.
 *
 * Test Flow:
 *
 * 1. Create moderator account for administrative access
 * 2. Create member accounts for article authorship and comment authorship
 * 3. Create an article in the Economics category as first member
 * 4. Post a comment on the article as second member
 * 5. Switch to moderator context and approve the comment
 * 6. Validate the comment is restored and publicly visible
 */
export async function test_api_comment_moderation_approval_restore(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator account created", moderator.id !== null);

  // Step 2: Create first member account (article author)
  const articleAuthorEmail = typia.random<string & tags.Format<"email">>();
  const articleAuthor: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: articleAuthorEmail,
        password: "AuthorPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(articleAuthor);
  TestValidator.predicate("article author created", articleAuthor.id !== null);

  // Step 3: Create second member account (comment author)
  const commentAuthorEmail = typia.random<string & tags.Format<"email">>();
  const commentAuthor: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: commentAuthorEmail,
        password: "CommentPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(commentAuthor);
  TestValidator.predicate("comment author created", commentAuthor.id !== null);

  // Step 4: Authenticate as article author and create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: articleAuthorEmail,
      password: "AuthorPass123",
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Impact of Trade Policies",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate("article created", article.id !== null);
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );

  // Step 5: Authenticate as comment author and create comment
  await api.functional.auth.member.login(connection, {
    body: {
      email: commentAuthorEmail,
      password: "CommentPass123",
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
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
  typia.assert(comment);
  TestValidator.predicate("comment created", comment.id !== null);
  TestValidator.equals(
    "comment initial status is published",
    comment.status,
    "published",
  );

  // Step 6: Authenticate as moderator and approve the comment
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const approvedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.moderation.comments.update(
      connection,
      {
        commentId: comment.id,
        body: {
          action_type: "approve",
          reason: "Comment complies with community guidelines",
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(approvedComment);

  // Step 7: Validate the approved comment
  TestValidator.equals(
    "approved comment ID matches original",
    approvedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "approved comment status is published",
    approvedComment.status,
    "published",
  );
  TestValidator.equals(
    "approved comment content preserved",
    approvedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "approved comment author ID matches",
    approvedComment.discussion_board_member_id,
    comment.discussion_board_member_id,
  );
  TestValidator.equals(
    "approved comment article ID matches",
    approvedComment.discussion_board_article_id,
    comment.discussion_board_article_id,
  );
  TestValidator.predicate(
    "approved comment has valid created_at timestamp",
    approvedComment.created_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(approvedComment.created_at),
  );
  TestValidator.predicate(
    "approved comment has valid updated_at timestamp",
    approvedComment.updated_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(approvedComment.updated_at),
  );
  TestValidator.predicate(
    "moderator has proper permissions array",
    Array.isArray(moderator.permissions) && moderator.permissions.length > 0,
  );
}
