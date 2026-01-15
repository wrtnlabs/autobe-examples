import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotificationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_records_retrieval_admin_override(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create target user connection and generate notifications
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUserAuth = await api.functional.auth.admin.join(
    targetUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(targetUserAuth);
  // Step 3: Generate multiple notification records for the target user
  const notificationCount = 7;
  const notificationRecords = await ArrayUtil.asyncRepeat(
    notificationCount,
    async (index) => {
      const notification: IDiscussionBoardNotificationRecord = {
        id: typia.random<string & tags.Format<"uuid">>(),
        recipient_id: targetUserAuth.id,
        type: index % 2 === 0 ? "comment_reply" : "moderator_action",
        title: `Notification ${index + 1}`,
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        target_object_id:
          index % 3 === 0
            ? typia.random<string & tags.Format<"uuid">>()
            : undefined,
        target_object_type:
          index % 3 === 0
            ? index % 2 === 0
              ? "comment"
              : "report"
            : undefined,
        read_at: new Date().toISOString(),
        created_at: new Date(
          Date.now() - index * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      return notification;
    },
  );
  // Step 4: Verify that default user access cannot retrieve target user's notifications
  const defaultConnection: api.IConnection = { host: connection.host };
  await api.functional.auth.admin.login(defaultConnection, {
    body: {
      email: adminAuth.token.access,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.ILogin,
  });
  const defaultResponse =
    await api.functional.discussionBoard.notifications.records.index(
      defaultConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default access should not return target user notifications",
    defaultResponse.data.length,
    0,
  );
  // Step 5: Use admin connection to retrieve target user notifications
  const adminResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(adminResponse);
  // Step 6: Validate correct number of notifications retrieved
  TestValidator.equals(
    "admin should retrieve all target user notifications",
    adminResponse.data.length,
    notificationCount,
  );
  // Step 7: Validate that retrieved notifications belong to target user
  for (const record of adminResponse.data) {
    TestValidator.equals(
      "notification recipient should match target user",
      record.recipient_id,
      targetUserAuth.id,
    );
  }
  // Step 8: Test pagination with limit and page
  const paginatedResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "first page should have limit count",
    paginatedResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination limit should be 3",
    paginatedResponse.pagination.limit,
    3,
  );
  const secondPageResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page should have limit count",
    secondPageResponse.data.length,
    3,
  );
  // Step 9: Test sorting by createdAt (descending)
  const sortedResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
          orderBy: "createdAt",
          orderDirection: "desc",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(sortedResponse);
  for (let i = 0; i < sortedResponse.data.length - 1; i++) {
    const current = new Date(sortedResponse.data[i].created_at);
    const next = new Date(sortedResponse.data[i + 1].created_at);
    TestValidator.predicate(
      "notifications should be sorted in descending order by createdAt",
      current >= next,
    );
  }
  // Step 10: Test filtering by notification type
  const filteredResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
          notificationType: "comment_reply",
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Count comment_reply notifications in original dataset
  const commentReplyExpected = notificationRecords.filter(
    (n) => n.type === "comment_reply",
  ).length;
  TestValidator.equals(
    "filtered notifications should match comment_reply count",
    filteredResponse.data.length,
    commentReplyExpected,
  );
  for (const record of filteredResponse.data) {
    TestValidator.equals(
      "filtered notifications should be comment_reply type",
      record.type,
      "comment_reply",
    );
  }
  // Step 11: Test filtering by read status
  const unreadResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
          isRead: false,
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(unreadResponse);
  // All notifications in our test have been marked read (read_at is set), so count should be 0
  TestValidator.equals(
    "unread notifications should be zero",
    unreadResponse.data.length,
    0,
  );
  // Step 12: Test date range filtering - test today's notifications
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateRangeResponse =
    await api.functional.discussionBoard.notifications.records.index(
      adminConnection,
      {
        body: {
          recipientUserId: targetUserAuth.id,
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString(),
        } satisfies IDiscussionBoardNotificationRecord.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // All notifications were created within last 7 days, many should match today's range
  TestValidator.predicate(
    "date range response should have at least one notification",
    dateRangeResponse.data.length > 0,
  );
  for (const record of dateRangeResponse.data) {
    const recordDate = new Date(record.created_at);
    TestValidator.predicate(
      "notification date should be within range",
      recordDate >= today && recordDate < tomorrow,
    );
  }
}
