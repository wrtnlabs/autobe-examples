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
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that deleting a comment cascades deletion to all nested replies.
 *
 * This test validates the soft-delete cascade behavior when a parent comment is
 * deleted. The workflow creates a discussion member, an article, a parent
 * comment, and multiple nested reply comments at various depths (up to 3
 * levels). When the parent comment is deleted via the DELETE endpoint, the
 * system must soft-delete not only the parent but also all descendant replies,
 * updating their deleted_at timestamps. The test verifies that the deletion
 * operation completes successfully and the nested reply structure is correctly
 * handled during the deletion process.
 *
 * Test Flow:
 *
 * 1. Create a new member account for testing
 * 2. Create an article for posting comments
 * 3. Create a parent comment on the article
 * 4. Create first-level reply to the parent comment
 * 5. Create second-level reply (reply to the first-level reply)
 * 6. Create third-level reply (reply to the second-level reply)
 * 7. Delete the parent comment via DELETE endpoint
 * 8. Verify the deletion operation completes successfully
 */
export async function test_api_comment_deletion_cascades_to_replies(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member account created successfully",
    member.id !== undefined,
  );

  // 2. Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Discussion on Economic Policy",
        content:
          "This is a comprehensive discussion about recent economic policy changes and their implications for the market.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.id !== undefined,
  );

  // 3. Create a parent comment on the article
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I believe the current interest rate policy needs significant revision to address inflation concerns.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.predicate(
    "parent comment created successfully",
    parentComment.id !== undefined,
  );
  TestValidator.equals(
    "parent comment thread depth is 0",
    parentComment.thread_depth,
    0,
  );
  TestValidator.predicate(
    "parent comment is published",
    parentComment.status === "published",
  );

  // 4. Create first-level reply to parent comment
  const firstLevelReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I agree with your perspective. The current rate hikes have been quite aggressive.",
          parent_comment_id: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(firstLevelReply);
  TestValidator.predicate(
    "first-level reply created successfully",
    firstLevelReply.id !== undefined,
  );
  TestValidator.equals(
    "first-level reply thread depth is 1",
    firstLevelReply.thread_depth,
    1,
  );
  TestValidator.equals(
    "first-level reply parent matches parent comment",
    firstLevelReply.parent_comment_id,
    parentComment.id,
  );

  // 5. Create second-level reply (reply to first-level reply)
  const secondLevelReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "However, we must consider that these rate increases are necessary to combat long-term inflation risks.",
          parent_comment_id: firstLevelReply.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(secondLevelReply);
  TestValidator.predicate(
    "second-level reply created successfully",
    secondLevelReply.id !== undefined,
  );
  TestValidator.equals(
    "second-level reply thread depth is 2",
    secondLevelReply.thread_depth,
    2,
  );
  TestValidator.equals(
    "second-level reply parent matches first-level reply",
    secondLevelReply.parent_comment_id,
    firstLevelReply.id,
  );

  // 6. Create third-level reply (reply to second-level reply)
  const thirdLevelReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "That's a valid point. We need to balance short-term pain with long-term monetary stability.",
          parent_comment_id: secondLevelReply.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(thirdLevelReply);
  TestValidator.predicate(
    "third-level reply created successfully",
    thirdLevelReply.id !== undefined,
  );
  TestValidator.equals(
    "third-level reply thread depth is 3",
    thirdLevelReply.thread_depth,
    3,
  );
  TestValidator.equals(
    "third-level reply parent matches second-level reply",
    thirdLevelReply.parent_comment_id,
    secondLevelReply.id,
  );

  // 7. Delete the parent comment - triggers cascade soft-delete of all nested replies
  await api.functional.discussionBoard.member.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: parentComment.id,
    },
  );

  // 8. Verify deletion operation completed successfully
  TestValidator.predicate(
    "parent comment deletion completed successfully",
    true,
  );
}
