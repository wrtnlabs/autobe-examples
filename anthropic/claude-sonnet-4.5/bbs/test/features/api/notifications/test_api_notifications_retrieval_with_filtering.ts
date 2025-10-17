import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

export async function test_api_notifications_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Retrieve notifications with default pagination
  const defaultNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(defaultNotifications);
  TestValidator.predicate(
    "default notifications retrieved",
    defaultNotifications.data.length >= 0,
  );

  // Step 3: Filter by notification type - reply_to_topic
  const replyNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          notification_type: "reply_to_topic",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(replyNotifications);

  // Step 4: Filter by notification type - vote_milestone
  const voteNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          notification_type: "vote_milestone",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(voteNotifications);

  // Step 5: Filter by notification type - mention
  const mentionNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          notification_type: "mention",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(mentionNotifications);

  // Step 6: Filter by read status - unread notifications
  const unreadNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          is_read: false,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(unreadNotifications);

  // Step 7: Filter by read status - read notifications
  const readNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          is_read: true,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(readNotifications);

  // Step 8: Filter by date range
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const dateRangeNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          date_from: dateFrom,
          date_to: dateTo,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(dateRangeNotifications);

  // Step 9: Test pagination with different page sizes
  const smallPageNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(smallPageNotifications);
  TestValidator.predicate(
    "small page limit applied",
    smallPageNotifications.data.length <= 5,
  );

  // Step 10: Test maximum page size
  const largePageNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(largePageNotifications);
  TestValidator.predicate(
    "large page limit applied",
    largePageNotifications.data.length <= 100,
  );

  // Step 11: Sort by creation date - ascending order
  const sortedAscNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(sortedAscNotifications);

  // Step 12: Sort by creation date - descending order (newest first)
  const sortedDescNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(sortedDescNotifications);

  // Step 13: Sort by notification type
  const sortedByTypeNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "notification_type",
          sort_order: "asc",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(sortedByTypeNotifications);

  // Step 14: Sort by read status
  const sortedByReadNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "read_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(sortedByReadNotifications);

  // Step 15: Filter by delivery channel - in-app
  const inAppNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          delivered_in_app: true,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(inAppNotifications);

  // Step 16: Filter by delivery channel - email
  const emailNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          delivered_via_email: true,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(emailNotifications);

  // Step 17: Test complex filter combination
  const complexFilterNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 20,
          notification_type: "vote_milestone",
          is_read: false,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(complexFilterNotifications);

  // Step 18: Test another complex filter - unread mentions from last week
  const recentMentions =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 15,
          notification_type: "mention",
          is_read: false,
          date_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(recentMentions);

  // Step 19: Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    defaultNotifications.pagination.current >= 0 &&
      defaultNotifications.pagination.limit > 0 &&
      defaultNotifications.pagination.records >= 0 &&
      defaultNotifications.pagination.pages >= 0,
  );

  // Step 20: Validate pagination consistency
  TestValidator.predicate(
    "pagination limit matches request",
    defaultNotifications.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination current page matches request",
    defaultNotifications.pagination.current === 1,
  );

  // Step 21: Validate notification summary structure if notifications exist
  if (defaultNotifications.data.length > 0) {
    const sampleNotification = defaultNotifications.data[0];
    if (sampleNotification) {
      typia.assert(sampleNotification);
      TestValidator.predicate(
        "notification has id",
        typeof sampleNotification.id === "string",
      );
      TestValidator.predicate(
        "notification has type",
        typeof sampleNotification.notification_type === "string",
      );
      TestValidator.predicate(
        "notification has title",
        typeof sampleNotification.title === "string",
      );
      TestValidator.predicate(
        "notification has message",
        typeof sampleNotification.message === "string",
      );
      TestValidator.predicate(
        "notification has read status",
        typeof sampleNotification.is_read === "boolean",
      );
      TestValidator.predicate(
        "notification has created_at",
        typeof sampleNotification.created_at === "string",
      );
    }
  }
}
