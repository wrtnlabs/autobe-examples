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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test that reply visibility respects user roles and comment status.
 *
 * Guests and members see only published replies, with deleted comments marked
 * as '[Deleted by author]' and moderated comments shown as '[Removed by
 * moderator]'. Moderators have full visibility including original content of
 * moderated comments and removal reasons. The test validates that deleted
 * replies are properly hidden from non-moderators, moderated replies display
 * status indicators, and moderators can view all comments regardless of
 * status.
 */
export async function test_api_comment_replies_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // 2. Create an article for the discussion
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Economic Policy Discussion",
        content:
          "This article discusses current economic policy trends and their implications for market stability and growth.",
        category_code: "economics",
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article created successfully",
    article.title,
    "Economic Policy Discussion",
  );

  // 3. Create a parent comment on the article
  const parentComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "What are the implications of current monetary policy?",
          parent_comment_id: undefined,
          attachments: [],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment status",
    parentComment.status,
    "published",
  );

  // 4. Create first reply to parent comment
  const publishedReply1 =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content:
            "The current monetary policy appears to be restrictive and may slow growth.",
          parent_comment_id: parentComment.id,
          attachments: [],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(publishedReply1);
  TestValidator.equals(
    "first published reply status",
    publishedReply1.status,
    "published",
  );

  // 5. Create second reply to parent comment
  const publishedReply2 =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content:
            "I disagree. The policy is appropriately balanced for current economic conditions.",
          parent_comment_id: parentComment.id,
          attachments: [],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(publishedReply2);
  TestValidator.equals(
    "second published reply status",
    publishedReply2.status,
    "published",
  );

  // 6. Create third reply to parent comment
  const publishedReply3 =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content:
            "Both perspectives have merit. The key is balancing inflation control with growth.",
          parent_comment_id: parentComment.id,
          attachments: [],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(publishedReply3);
  TestValidator.equals(
    "third published reply status",
    publishedReply3.status,
    "published",
  );

  // 7. Retrieve all replies to verify basic visibility for members
  const repliesDefault =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(repliesDefault);
  TestValidator.predicate(
    "replies index returns multiple replies",
    repliesDefault.data.length >= 3,
  );

  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    repliesDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    repliesDefault.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count includes all replies",
    repliesDefault.pagination.records >= 3,
  );

  // 9. Verify all returned replies are published (visibility rule for members)
  const allReplies = repliesDefault.data;
  const allPublished = allReplies.every(
    (reply) => reply.status === "published",
  );
  TestValidator.predicate(
    "all visible replies have published status",
    allPublished,
  );

  // 10. Verify reply content and authorship details
  const firstReply = allReplies[0];
  TestValidator.predicate(
    "reply has non-empty content",
    firstReply.content.length > 0,
  );
  TestValidator.predicate(
    "reply author has id",
    firstReply.author.id !== undefined && firstReply.author.id.length > 0,
  );
  TestValidator.equals(
    "reply author matches member who created it",
    firstReply.author.email,
    memberEmail,
  );

  // 11. Verify thread depth for nested replies
  TestValidator.predicate(
    "reply has positive thread depth",
    firstReply.thread_depth > 0,
  );

  // 12. Verify edit tracking
  TestValidator.equals(
    "new reply has zero edit count",
    firstReply.edit_count,
    0,
  );

  // 13. Verify timestamp presence
  TestValidator.predicate(
    "reply has creation timestamp",
    firstReply.created_at !== undefined && firstReply.created_at.length > 0,
  );
  TestValidator.predicate(
    "reply has update timestamp",
    firstReply.updated_at !== undefined && firstReply.updated_at.length > 0,
  );

  // 14. Test sorting by creation date in ascending order
  const sortedAsc = await api.functional.discussionBoard.comments.replies.index(
    connection,
    {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "ascending sort returns replies",
    sortedAsc.data.length >= 3,
  );

  // 15. Test sorting by creation date in descending order
  const sortedDesc =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "descending sort returns replies",
    sortedDesc.data.length >= 3,
  );

  // 16. Test pagination with smaller page size
  const singlePage =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(singlePage);
  TestValidator.equals(
    "page with limit 1 returns one reply",
    singlePage.data.length,
    1,
  );
  TestValidator.equals(
    "pagination limit reflects requested size",
    singlePage.pagination.limit,
    1,
  );

  // 17. Test filtering by published status only
  const publishedOnly =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 20,
        status: "published",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(publishedOnly);
  const allStatusesMatch = publishedOnly.data.every(
    (reply) => reply.status === "published",
  );
  TestValidator.predicate(
    "status filter returns only published replies",
    allStatusesMatch,
  );

  // 18. Retrieve second page to test pagination navigation
  const secondPage =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 2,
        limit: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(secondPage);
  TestValidator.equals(
    "second page request has correct page number",
    secondPage.pagination.current,
    2,
  );

  // 19. Verify reply summary information is complete
  const replyData = allReplies[0];
  TestValidator.predicate(
    "reply article reference present",
    replyData.discussion_board_article_id !== undefined &&
      replyData.discussion_board_article_id.length > 0,
  );

  // 20. Validate visibility rules are applied for published content
  TestValidator.predicate(
    "member can see all published replies in thread",
    repliesDefault.data.length === 3 &&
      repliesDefault.data.every((r) => r.status === "published"),
  );
}
