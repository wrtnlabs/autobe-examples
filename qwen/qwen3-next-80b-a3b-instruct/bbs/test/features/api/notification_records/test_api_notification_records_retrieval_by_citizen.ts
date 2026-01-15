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
export async function test_api_notification_records_retrieval_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenInfo = await authorize_member_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(citizenInfo);
  // Test: Retrieve all notifications (without explicitly specifying recipientUserId)
  // The system should automatically use citizenInfo.id from JWT token
  let response =
    await api.functional.discussionBoard.notifications.records.index(
      citizenConnection,
      { body: {} },
    );
  typia.assert(response);
  // Validate that all returned notifications belong to the authenticated citizen
  response.data.forEach((notification) => {
    TestValidator.equals(
      "each notification recipient_id matches citizen id",
      notification.recipient_id,
      citizenInfo.id,
    );
  });
  // Test: Filter by unread notifications only
  response = await api.functional.discussionBoard.notifications.records.index(
    citizenConnection,
    { body: { isRead: false } },
  );
  typia.assert(response);
  // Validate unread notifications
  const unreadCount = response.data.filter((n) => n.read_at === null).length;
  TestValidator.predicate(
    "should return only unread notifications",
    unreadCount === response.data.length,
  );
  // Test: Filter by read notifications only
  response = await api.functional.discussionBoard.notifications.records.index(
    citizenConnection,
    { body: { isRead: true } },
  );
  typia.assert(response);
  // Validate read notifications
  const readCount = response.data.filter((n) => n.read_at !== null).length;
  TestValidator.predicate(
    "should return only read notifications",
    readCount === response.data.length,
  );
  // Test: Filter by notification type
  const specificType = "comment_reply";
  response = await api.functional.discussionBoard.notifications.records.index(
    citizenConnection,
    { body: { notificationType: specificType } },
  );
  typia.assert(response);
  // Validate filtered notifications by type
  const typeCount = response.data.filter((n) => n.type === specificType).length;
  TestValidator.predicate(
    "should return notifications of specific type",
    typeCount === response.data.length,
  );
  // Test: Date range filtering
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString(); // 7 days ago
  const endDate = new Date(Date.now() - 1 * 86400000).toISOString(); // 1 day ago
  response = await api.functional.discussionBoard.notifications.records.index(
    citizenConnection,
    { body: { startDate, endDate } },
  );
  typia.assert(response);
  // Validate date range filtering
  response.data.forEach((notification) => {
    TestValidator.predicate(
      "notification created_at within date range",
      notification.created_at >= startDate &&
        notification.created_at <= endDate,
    );
  });
  // Test: Pagination
  response = await api.functional.discussionBoard.notifications.records.index(
    citizenConnection,
    { body: { page: 1, limit: 2 } },
  );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "first page should return 2 records",
    response.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    response.pagination.limit,
    2,
  );
  // Test: Sort by createdAt descending (default)
  response = await api.functional.discussionBoard.notifications.records.index(
    citizenConnection,
    { body: {} },
  );
  typia.assert(response);
  // Validate descending sort by createdAt
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "notifications sorted by createdAt descending",
      current >= next,
    );
  }
  // Test: Attempt to access another user's notifications (should fail)
  // Create a second citizen user
  const otherCitizenConnection: api.IConnection = { host: connection.host };
  const otherCitizenInfo = await authorize_member_join(otherCitizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(otherCitizenInfo);
  // Now try to access notifications for the other user using the original citizen connection
  await TestValidator.error(
    "should reject unauthorized access to other user's notifications",
    async () => {
      await api.functional.discussionBoard.notifications.records.index(
        citizenConnection,
        { body: { recipientUserId: otherCitizenInfo.id } },
      );
    },
  );
}
