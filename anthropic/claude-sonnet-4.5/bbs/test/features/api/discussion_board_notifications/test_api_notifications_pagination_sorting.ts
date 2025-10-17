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

/**
 * Test notification pagination and sorting API functionality.
 *
 * This test validates the notification retrieval API's pagination and sorting
 * capabilities. Since we cannot generate actual notifications without
 * additional users and complete database setup (categories, etc.), this test
 * focuses on validating the API's pagination and sorting mechanics work
 * correctly regardless of the number of notifications present.
 *
 * The test verifies:
 *
 * 1. Member account creation and authentication
 * 2. Notification retrieval with pagination parameters
 * 3. Pagination metadata structure and consistency
 * 4. Sorting by creation date in descending order (newest first)
 * 5. Sorting by creation date in ascending order (oldest first)
 * 6. Sorting by notification type
 * 7. Page navigation capabilities
 * 8. Consistent pagination metadata across different pages and sorting methods
 */
export async function test_api_notifications_pagination_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create member account for notification testing
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Test pagination with page size of 10 (default descending order)
  const page1Request = {
    page: 1,
    limit: 10,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const page1: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: page1Request,
      },
    );
  typia.assert(page1);

  // Step 3: Verify pagination metadata structure
  TestValidator.predicate(
    "current page should be non-negative",
    page1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.equals(
    "page 1 current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    page1.pagination.limit,
    10,
  );
  TestValidator.predicate("data should be array", Array.isArray(page1.data));

  // Step 4: If there are notifications, verify descending order sorting
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i].created_at).getTime();
      const next = new Date(page1.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `notification ${i} should be newer than or equal to notification ${i + 1}`,
        current >= next,
      );
    }
  }

  // Step 5: Test ascending order sorting
  const ascRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const ascPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: ascRequest,
      },
    );
  typia.assert(ascPage);

  // Verify ascending order if notifications exist
  if (ascPage.data.length > 1) {
    for (let i = 0; i < ascPage.data.length - 1; i++) {
      const current = new Date(ascPage.data[i].created_at).getTime();
      const next = new Date(ascPage.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `notification ${i} should be older than or equal to notification ${i + 1} in ascending order`,
        current <= next,
      );
    }
  }

  // Step 6: Test sorting by notification type
  const typeRequest = {
    page: 1,
    limit: 10,
    sort_by: "notification_type" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const typePage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: typeRequest,
      },
    );
  typia.assert(typePage);

  // Verify pagination metadata consistency across different sort methods
  TestValidator.equals(
    "total records should be consistent across sorting methods",
    page1.pagination.records,
    typePage.pagination.records,
  );

  // Step 7: Test different page sizes
  const smallPageRequest = {
    page: 1,
    limit: 5,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const smallPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page limit should be 5",
    smallPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page data length should not exceed limit",
    smallPage.data.length <= 5,
  );

  // Step 8: Test filtering by notification type
  const notificationTypes = [
    "reply_to_topic" as const,
    "reply_to_comment" as const,
    "mention" as const,
    "vote_milestone" as const,
  ];

  for (const notifType of notificationTypes) {
    const typeFilterRequest = {
      page: 1,
      limit: 10,
      notification_type: notifType,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    } satisfies IDiscussionBoardNotification.IRequest;

    const filteredPage: IPageIDiscussionBoardNotification.ISummary =
      await api.functional.discussionBoard.member.users.notifications.index(
        connection,
        {
          userId: member.id,
          body: typeFilterRequest,
        },
      );
    typia.assert(filteredPage);

    // Verify all returned notifications match the filter type
    for (const notification of filteredPage.data) {
      TestValidator.equals(
        `filtered notification should have type ${notifType}`,
        notification.notification_type,
        notifType,
      );
    }
  }

  // Step 9: Test read status filtering
  const unreadRequest = {
    page: 1,
    limit: 10,
    is_read: false,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const unreadPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: unreadRequest,
      },
    );
  typia.assert(unreadPage);

  // Verify all returned notifications are unread
  for (const notification of unreadPage.data) {
    TestValidator.equals(
      "filtered notification should be unread",
      notification.is_read,
      false,
    );
  }

  // Step 10: Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const dateRangeRequest = {
    page: 1,
    limit: 10,
    date_from: pastDate.toISOString(),
    date_to: now.toISOString(),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const dateRangePage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: member.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangePage);

  // Verify all notifications are within date range
  const pastTime = pastDate.getTime();
  const nowTime = now.getTime();
  for (const notification of dateRangePage.data) {
    const notificationTime = new Date(notification.created_at).getTime();
    TestValidator.predicate(
      "notification should be within date range",
      notificationTime >= pastTime && notificationTime <= nowTime,
    );
  }
}
