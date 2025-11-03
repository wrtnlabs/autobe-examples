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
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

/**
 * Test comprehensive notification discovery and filtering for members receiving
 * notifications from realistic platform interactions. Validates the complete
 * notification lifecycle including:
 *
 * - Notification generation from comment interactions
 * - Filtering by notification type and read status
 * - Pagination of notification lists
 * - Exclusion of deleted notifications
 * - Complete notification metadata with action URLs for deep navigation
 *
 * The test creates a multi-member scenario:
 *
 * 1. Member A creates an article on Economics
 * 2. Member B posts a top-level comment on Member A's article (triggers
 *    notification to A)
 * 3. Member C replies to Member B's comment (triggers notification to B)
 * 4. Member A retrieves notifications filtered by type and validates results
 * 5. Notifications include source member, article context, and action URLs
 * 6. Filtering by read/unread status works correctly
 * 7. Pagination handles multiple results appropriately
 * 8. Deleted notifications are excluded from results
 */
export async function test_api_notification_discovery_with_member_interactions(
  connection: api.IConnection,
) {
  // Step 1: Create Member A (article author)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberA);
  TestValidator.predicate(
    "Member A should be authorized",
    memberA.token !== null,
  );

  // Step 2: Member A creates an article on Economics topic
  const articleByMemberA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Policy Analysis: Trade Agreements Impact",
        content:
          "This article discusses the impact of trade agreements on economic growth and market dynamics across different regions.",
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(articleByMemberA);
  TestValidator.equals(
    "article title matches",
    articleByMemberA.title,
    "Economic Policy Analysis: Trade Agreements Impact",
  );
  TestValidator.equals(
    "article status is published",
    articleByMemberA.status,
    "published",
  );

  // Step 3: Create Member B (commenter)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberB);

  // Step 4: Member B posts a top-level comment on Member A's article
  const commentByMemberB: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: articleByMemberA.id,
        body: {
          content:
            "Excellent analysis on trade agreements. The perspectives on market dynamics are particularly insightful.",
          parent_comment_id: undefined,
          attachments: undefined,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentByMemberB);
  TestValidator.equals(
    "comment status is published",
    commentByMemberB.status,
    "published",
  );
  TestValidator.equals(
    "comment thread depth is 0 for top-level",
    commentByMemberB.thread_depth,
    0,
  );

  // Step 5: Create Member C (replier)
  const memberCEmail = typia.random<string & tags.Format<"email">>();
  const memberC: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberCEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberC);

  // Step 6: Member C replies to Member B's comment (triggers notification to B)
  const replyByMemberC: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: articleByMemberA.id,
        body: {
          content:
            "I agree with your analysis. The data you presented supports the thesis effectively.",
          parent_comment_id: commentByMemberB.id,
          attachments: undefined,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(replyByMemberC);
  TestValidator.equals(
    "reply parent comment id matches",
    replyByMemberC.parent_comment_id,
    commentByMemberB.id,
  );
  TestValidator.equals(
    "reply thread depth is 1",
    replyByMemberC.thread_depth,
    1,
  );

  // Step 7: Re-authenticate as Member A to retrieve notifications
  // Member A joins again which sets the authorization token
  const memberAReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAReauth);

  // Step 8: Member A retrieves notifications filtered by type (comment_reply)
  const memberANotifications: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.patch(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          notification_type: "comment_reply",
          is_read: undefined,
          search: undefined,
          sort_by: "created_at",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(memberANotifications);
  TestValidator.predicate(
    "Member A should have notifications",
    memberANotifications.data.length > 0,
  );
  TestValidator.equals(
    "notification type is comment_reply",
    memberANotifications.data[0].notification_type,
    "comment_reply",
  );

  // Step 9: Validate notification metadata includes complete context
  const memberANotif = memberANotifications.data[0];
  TestValidator.predicate(
    "notification has recipient member id",
    memberANotif.recipient_member_id !== null &&
      memberANotif.recipient_member_id !== undefined,
  );
  TestValidator.predicate(
    "notification has triggering article id",
    memberANotif.triggering_article_id !== null &&
      memberANotif.triggering_article_id !== undefined,
  );
  TestValidator.predicate(
    "notification has triggering comment id",
    memberANotif.triggering_comment_id !== null &&
      memberANotif.triggering_comment_id !== undefined,
  );
  TestValidator.predicate(
    "notification has source member id",
    memberANotif.source_member_id !== null &&
      memberANotif.source_member_id !== undefined,
  );
  TestValidator.predicate(
    "notification has action url",
    memberANotif.action_url !== null && memberANotif.action_url !== undefined,
  );
  TestValidator.predicate(
    "notification has title",
    memberANotif.title.length > 0,
  );
  TestValidator.predicate(
    "notification has message",
    memberANotif.message.length > 0,
  );

  // Step 10: Filter notifications by unread status
  const unreadNotifications: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.patch(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          notification_type: undefined,
          is_read: false,
          search: undefined,
          sort_by: "created_at",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(unreadNotifications);
  TestValidator.predicate(
    "unread notifications should be filtered correctly",
    unreadNotifications.data.every((n) => n.is_read === false),
  );

  // Step 11: Validate pagination information
  TestValidator.predicate(
    "pagination has current page",
    unreadNotifications.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    unreadNotifications.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    unreadNotifications.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    unreadNotifications.pagination.pages >= 0,
  );

  // Step 12: Switch to Member B and retrieve their notifications
  const memberBReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberBReauth);

  const memberBNotifications: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.patch(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          notification_type: "comment_reply",
          is_read: undefined,
          search: undefined,
          sort_by: "created_at",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(memberBNotifications);
  TestValidator.predicate(
    "Member B should have reply notifications",
    memberBNotifications.data.length > 0,
  );

  // Step 13: Validate that deleted notifications are excluded
  const allNotifications: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.patch(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          notification_type: undefined,
          is_read: undefined,
          search: undefined,
          sort_by: "created_at",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(allNotifications);
  TestValidator.predicate(
    "deleted notifications should be excluded",
    allNotifications.data.every(
      (n) => n.deleted_at === null || n.deleted_at === undefined,
    ),
  );

  // Step 14: Validate action URL structure for navigation
  const notificationWithUrl = memberBNotifications.data[0];
  if (notificationWithUrl?.action_url) {
    TestValidator.predicate(
      "action url should be valid URI",
      notificationWithUrl.action_url.includes("/articles/") ||
        notificationWithUrl.action_url.includes("#comment-"),
    );
  }

  // Step 15: Test pagination with different limits
  const limitedNotifications: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.patch(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          notification_type: undefined,
          is_read: undefined,
          search: undefined,
          sort_by: "created_at",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(limitedNotifications);
  TestValidator.predicate(
    "pagination limit should be respected",
    limitedNotifications.data.length <= 5,
  );
}
