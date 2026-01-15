import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotificationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationRecord";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_records_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish context for notifications
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(member);
  // Declare now once at function scope
  const now = new Date();
  // Step 2: Generate 20 mock notification records with different types, read statuses, and timestamps
  // Since there's no creation endpoint for notifications, we'll create mock objects
  const notificationTypes = [
    "comment_reply",
    "post_report",
    "moderator_action",
    "appeal_decision",
    "system_update",
  ] as const;
  const readStates = [true, false] as const;
  // Create 20 random notifications with varying parameters
  const notifications: IDiscussionBoardNotificationRecord[] =
    await ArrayUtil.asyncRepeat(20, async (index) => {
      const notificationType: (typeof notificationTypes)[number] =
        RandomGenerator.pick(notificationTypes);
      const isRead = RandomGenerator.pick(readStates);
      // Create notification with random timestamp, some within last 3 days, some older than 3 days
      const daysAgo = index % 5 === 0 ? 20 : index % 3 === 0 ? 2 : 0;
      const createdAt = RandomGenerator.date(
        now,
        daysAgo * 24 * 60 * 60 * 1000,
      );
      // Use the correct property name that's defined in IRequest: recipientUserId
      const readAtValue: string | null = isRead
        ? createdAt.toISOString()
        : null;
      const notification: IDiscussionBoardNotificationRecord = {
        id: typia.random<string & tags.Format<"uuid">>(),
        recipient_id: member.id,
        type: notificationType,
        title: `Notification type: ${notificationType}`,
        content: `This is a ${notificationType} notification generated for testing purposes.`,
        target_object_id:
          index % 2 === 0
            ? typia.random<string & tags.Format<"uuid">>()
            : undefined,
        target_object_type: index % 2 === 0 ? ("comment" as const) : undefined,
        // We'll use typia.assert to handle the type conflict between the schema (non-null) and documentation (nullable)
        read_at: typia.assert<string & tags.Format<"date-time">>(
          readAtValue! as string,
        ),
        created_at: createdAt.toISOString(),
      };
      return notification;
    });
  // Step 3: Test pagination with default parameters (page=1, limit=20)
  const defaultResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default pagination: current page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination: limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination: records should match total notifications",
    defaultResponse.pagination.records,
    20,
  );
  TestValidator.equals(
    "default pagination: pages should be 1",
    defaultResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "default pagination: data should contain 20 records",
    defaultResponse.data.length,
    20,
  );
  // Step 4: Test pagination with limit=5 and page=2 (expecting 5 records)
  const limit5Page2Response: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(limit5Page2Response);
  TestValidator.equals(
    "limit=5, page=2: current page should be 2",
    limit5Page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit=5, page=2: limit should be 5",
    limit5Page2Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "limit=5, page=2: records should be 20",
    limit5Page2Response.pagination.records,
    20,
  );
  TestValidator.equals(
    "limit=5, page=2: pages should be 4",
    limit5Page2Response.pagination.pages,
    4,
  );
  TestValidator.equals(
    "limit=5, page=2: data should contain 5 records",
    limit5Page2Response.data.length,
    5,
  );
  // Step 5: Test filtering by notification type
  const commentReplyNotifications = notifications.filter(
    (n) => n.type === "comment_reply",
  );
  const commentReplyResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          notificationType: "comment_reply",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(commentReplyResponse);
  TestValidator.equals(
    "filter by type: current page should be 1",
    commentReplyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filter by type: records should match filtered count",
    commentReplyResponse.pagination.records,
    commentReplyNotifications.length,
  );
  TestValidator.equals(
    "filter by type: all records should have type comment_reply",
    commentReplyResponse.data.every((n) => n.type === "comment_reply"),
    true,
  );
  // Step 6: Test filtering by read status (unread only)
  const unreadNotifications = notifications.filter((n) => n.read_at === null);
  const unreadResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          isRead: false,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(unreadResponse);
  TestValidator.equals(
    "filter by unread status: records should match unread count",
    unreadResponse.pagination.records,
    unreadNotifications.length,
  );
  TestValidator.equals(
    "filter by unread status: all records should be unread",
    unreadResponse.data.every((n) => n.read_at === null),
    true,
  );
  // Step 7: Test filtering by read status (read only)
  const readNotifications = notifications.filter((n) => n.read_at !== null);
  const readResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          isRead: true,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(readResponse);
  TestValidator.equals(
    "filter by read status: records should match read count",
    readResponse.pagination.records,
    readNotifications.length,
  );
  TestValidator.equals(
    "filter by read status: all records should be read",
    readResponse.data.every((n) => n.read_at !== null),
    true,
  );
  // Step 8: Test filtering by date range (last 3 days)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const recentNotifications = notifications.filter(
    (n) => new Date(n.created_at) >= threeDaysAgo,
  );
  const recentResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          startDate: threeDaysAgo.toISOString(),
          endDate: now.toISOString(),
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(recentResponse);
  TestValidator.equals(
    "filter by date range: records should match recent count",
    recentResponse.pagination.records,
    recentNotifications.length,
  );
  TestValidator.equals(
    "filter by date range: all records should be within date range",
    recentResponse.data.every((n) => {
      const date = new Date(n.created_at);
      return date >= threeDaysAgo && date <= now;
    }),
    true,
  );
  // Step 9: Test complex filtering (unread comment replies from last 3 days)
  const complexFiltered = notifications.filter(
    (n) =>
      n.type === "comment_reply" &&
      n.read_at === null &&
      new Date(n.created_at) >= threeDaysAgo,
  );
  const complexResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          notificationType: "comment_reply",
          isRead: false,
          startDate: threeDaysAgo.toISOString(),
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(complexResponse);
  TestValidator.equals(
    "complex filter: records should match complex filtered count",
    complexResponse.pagination.records,
    complexFiltered.length,
  );
  TestValidator.equals(
    "complex filter: all records should be comment_reply",
    complexResponse.data.every((n) => n.type === "comment_reply"),
    true,
  );
  TestValidator.equals(
    "complex filter: all records should be unread",
    complexResponse.data.every((n) => n.read_at === null),
    true,
  );
  TestValidator.equals(
    "complex filter: all records should be within date range",
    complexResponse.data.every((n) => new Date(n.created_at) >= threeDaysAgo),
    true,
  );
  // Step 10: Test sorting by createdAt ascending
  const sortedByCreatedAtAsc = [...notifications].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const sortCreatedAtAscResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "createdAt",
          orderDirection: "asc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortCreatedAtAscResponse);
  TestValidator.index(
    "sort by createdAt ascending",
    sortedByCreatedAtAsc,
    sortCreatedAtAscResponse.data,
  );
  // Step 11: Test sorting by createdAt descending
  const sortedByCreatedAtDesc = [...notifications].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const sortCreatedAtDescResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "createdAt",
          orderDirection: "desc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortCreatedAtDescResponse);
  TestValidator.index(
    "sort by createdAt descending",
    sortedByCreatedAtDesc,
    sortCreatedAtDescResponse.data,
  );
  // Step 12: Test sorting by isRead ascending (unread first)
  const sortedByIsReadAsc = [...notifications].sort((a, b) => {
    const aRead = a.read_at === null ? 0 : 1;
    const bRead = b.read_at === null ? 0 : 1;
    return aRead - bRead;
  });
  const sortIsReadAscResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "isRead",
          orderDirection: "asc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortIsReadAscResponse);
  TestValidator.index(
    "sort by isRead ascending",
    sortedByIsReadAsc,
    sortIsReadAscResponse.data,
  );
  // Step 13: Test sorting by isRead descending (read first)
  const sortedByIsReadDesc = [...notifications].sort((a, b) => {
    const aRead = a.read_at === null ? 0 : 1;
    const bRead = b.read_at === null ? 0 : 1;
    return bRead - aRead;
  });
  const sortIsReadDescResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "isRead",
          orderDirection: "desc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortIsReadDescResponse);
  TestValidator.index(
    "sort by isRead descending",
    sortedByIsReadDesc,
    sortIsReadDescResponse.data,
  );
  // Step 14: Test sorting by notificationType ascending
  const sortedByTypeAsc = [...notifications].sort((a, b) =>
    a.type.localeCompare(b.type),
  );
  const sortTypeAscResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "notificationType",
          orderDirection: "asc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortTypeAscResponse);
  TestValidator.index(
    "sort by notificationType ascending",
    sortedByTypeAsc,
    sortTypeAscResponse.data,
  );
  // Step 15: Test sorting by notificationType descending
  const sortedByTypeDesc = [...notifications].sort((a, b) =>
    b.type.localeCompare(a.type),
  );
  const sortTypeDescResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "notificationType",
          orderDirection: "desc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortTypeDescResponse);
  TestValidator.index(
    "sort by notificationType descending",
    sortedByTypeDesc,
    sortTypeDescResponse.data,
  );
  // Step 16: Test that omitting recipientUserId uses authenticated user ID
  const omitRecipientResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          // recipientUserId is omitted - should use member.id from auth context
          notificationType: "comment_reply",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(omitRecipientResponse);
  TestValidator.equals(
    "omitting recipientUserId works",
    omitRecipientResponse.pagination.records,
    commentReplyNotifications.length,
  );
  // Step 17: Test that invalid recipientUserId returns empty results
  const invalidUserId = typia.random<string & tags.Format<"uuid">>();
  const invalidRecipientResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: invalidUserId,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(invalidRecipientResponse);
  TestValidator.equals(
    "invalid recipientUserId returns 0 records",
    invalidRecipientResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid recipientUserId returns empty data",
    invalidRecipientResponse.data.length,
    0,
  );
  // Step 18: Test that invalid notificationType returns empty results
  const invalidType = "invalid_type" as const;
  const invalidTypeResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          notificationType: invalidType,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(invalidTypeResponse);
  TestValidator.equals(
    "invalid notificationType returns 0 records",
    invalidTypeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid notificationType returns empty data",
    invalidTypeResponse.data.length,
    0,
  );
  // Step 19: Test limit parameter boundary (1)
  const limit1Response: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          limit: 1,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(limit1Response);
  TestValidator.equals(
    "limit=1: records should be 20",
    limit1Response.pagination.records,
    20,
  );
  TestValidator.equals(
    "limit=1: pages should be 20",
    limit1Response.pagination.pages,
    20,
  );
  TestValidator.equals(
    "limit=1: data should have 1 record",
    limit1Response.data.length,
    1,
  );
  // Step 20: Test limit parameter boundary (100)
  const limit100Response: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          limit: 100,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit=100: records should be 20",
    limit100Response.pagination.records,
    20,
  );
  TestValidator.equals(
    "limit=100: pages should be 1",
    limit100Response.pagination.pages,
    1,
  );
  TestValidator.equals(
    "limit=100: data should have 20 records",
    limit100Response.data.length,
    20,
  );
  // Step 21: Test page parameter boundary (1)
  const page1Response: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page=1: current page should be 1",
    page1Response.pagination.current,
    1,
  );
  // Step 22: Test page parameter boundary (max)
  const maxPageResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          limit: 5,
          page: 4, // 20/5 = 4 pages
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(maxPageResponse);
  TestValidator.equals(
    "page=max: current page should be 4",
    maxPageResponse.pagination.current,
    4,
  );
  TestValidator.equals(
    "page=max: data should have 0-5 records",
    maxPageResponse.data.length <= 5,
    true,
  );
  // Step 23: Test page parameter beyond range
  const pageBeyondResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          limit: 5,
          page: 100, // Far beyond range
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(pageBeyondResponse);
  TestValidator.equals(
    "page beyond range: current page should be 4 (last page)",
    pageBeyondResponse.pagination.current,
    4,
  );
  TestValidator.equals(
    "page beyond range: records should be 20",
    pageBeyondResponse.pagination.records,
    20,
  );
  TestValidator.equals(
    "page beyond range: pages should be 4",
    pageBeyondResponse.pagination.pages,
    4,
  );
  TestValidator.equals(
    "page beyond range: data should have empty array",
    pageBeyondResponse.data.length,
    0,
  );
  // Step 24: Test invalid orderDirection value
  const invalidOrderResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "createdAt",
          orderDirection: "invalid" as any,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(invalidOrderResponse);
  TestValidator.equals(
    "invalid orderDirection falls back to default",
    invalidOrderResponse.pagination.records,
    20,
  );
  // Step 25: Test invalid orderBy value
  const invalidFieldResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          orderBy: "invalid_field" as any,
          orderDirection: "desc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(invalidFieldResponse);
  TestValidator.equals(
    "invalid orderBy falls back to default",
    invalidFieldResponse.pagination.records,
    20,
  );
  // Step 26: Validate that notification records returned in order of createdAt descending by default
  const sortedByCreatedAtDefault = [...notifications].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const defaultOrderResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(defaultOrderResponse);
  TestValidator.index(
    "default sort should be createdAt descending",
    sortedByCreatedAtDefault,
    defaultOrderResponse.data,
  );
  // Step 27: Test that isRead and notificationType filtering works correctly in combination with sorting
  // Create a controlled subset for easier testing
  const subset1 = notifications.filter((n) => n.type === "comment_reply");
  const subset2 = subset1.filter((n) => n.read_at === null);
  const sortedSubset2 = [...subset2].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const filteredSortedResponse: IPageIDiscussionBoardNotificationRecord =
    await api.functional.discussionBoard.notifications.records.index(
      memberConnection,
      {
        body: {
          recipientUserId: member.id,
          notificationType: "comment_reply",
          isRead: false,
          orderBy: "createdAt",
          orderDirection: "desc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(filteredSortedResponse);
  TestValidator.index(
    "filtered + sorted: comment_reply + unread + createdAt descending",
    sortedSubset2,
    filteredSortedResponse.data,
  );
}
