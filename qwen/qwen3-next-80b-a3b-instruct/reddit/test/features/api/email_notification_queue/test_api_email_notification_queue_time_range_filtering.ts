import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformEmailNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEmailNotificationQueue";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformEmailNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEmailNotificationQueue";
import { prepare_random_community_platform_email_notification_queue } from "../../../prepare/prepare_random_community_platform_email_notification_queue";
import { generate_random_community_platform_admin_email_notification_queue_create } from "../../../generate/generate_random_community_platform_admin_email_notification_queue_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_email_notification_queue_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create test notifications with specific timestamps across different days
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  // Create notification from two days ago - should be excluded by created_after
  const oldNotification =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: typia.random<string & tags.Format<"email">>(),
          subject: "Notification from two days ago", 
          content: "This notification was created two days ago.",
          priority: "normal",
          retry_count: 3,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(oldNotification);
  // Create notification from yesterday - should be included in range
  const recentNotification =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: typia.random<string & tags.Format<"email">>(),
          subject: "Notification from yesterday",
          content: "This notification was created yesterday.",
          priority: "normal",
          retry_count: 2,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(recentNotification);
  // Create notification from today - should be included in range
  const todayNotification =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: typia.random<string & tags.Format<"email">>(),
          subject: "Notification from today",
          content: "This notification was created today.",
          priority: "high",
          retry_count: 1,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(todayNotification);
  // Step 3: Define time range for filtering - from yesterday to today
  const created_after = yesterday.toISOString();
  const created_before = now.toISOString();
  // Step 4: Call the index endpoint with time range filters
  const result =
    await api.functional.communityPlatform.email_notification_queue.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
          created_after,
          created_before,
        } satisfies ICommunityPlatformEmailNotificationQueue.IRequest,
      },
    );
  typia.assert(result);
  // Step 5: Validate that only notifications within the time range are returned
  // Two notifications should be returned: yesterday and today
  TestValidator.equals("result count matches expected", result.data.length, 2);
  // Verify the returned notifications are exactly the recent one and today's one
  const returnedIds = result.data.map((item) => item.notification_id);
  TestValidator.predicate("recent notification is included", () =>
    returnedIds.includes(recentNotification.queue_id),
  );
  TestValidator.predicate("today notification is included", () =>
    returnedIds.includes(todayNotification.queue_id),
  );
  TestValidator.predicate(
    "old notification is excluded",
    () => !returnedIds.includes(oldNotification.queue_id),
  );
  // Step 6: Verify the notifications are ordered by created_at ascending
  const createdAsts = result.data.map((item) => new Date(item.created_at));
  for (let i = 1; i < createdAsts.length; i++) {
    TestValidator.predicate(
      "notifications ordered by created_at ascending",
      () => createdAsts[i - 1] <= createdAsts[i],
    );
  }
  // Step 7: Extra test - verify boundary conditions
  // Test that created_after inclusive (equal to timestamp)
  const resultAfterExactlyYesterday =
    await api.functional.communityPlatform.email_notification_queue.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
          created_after: (recentNotification satisfies ICommunityPlatformEmailNotificationQueue as ICommunityPlatformEmailNotificationQueue & { created_at: string }).created_at,
          created_before: now.toISOString(),
        } satisfies ICommunityPlatformEmailNotificationQueue.IRequest,
      },
    );
  typia.assert(resultAfterExactlyYesterday);
  TestValidator.equals(
    "boundary condition (created_after equal) - count",
    resultAfterExactlyYesterday.data.length,
    2,
  );
  TestValidator.predicate("recent notification included (boundary)", () =>
    resultAfterExactlyYesterday.data
      .map((item) => item.notification_id)
      .includes(recentNotification.queue_id),
  );
  // Test that created_before inclusive (equal to timestamp)
  const resultBeforeExactlyToday =
    await api.functional.communityPlatform.email_notification_queue.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
          created_after: twoDaysAgo.toISOString(),
          created_before: (todayNotification satisfies ICommunityPlatformEmailNotificationQueue as ICommunityPlatformEmailNotificationQueue & { created_at: string }).created_at,
        } satisfies ICommunityPlatformEmailNotificationQueue.IRequest,
      },
    );
  typia.assert(resultBeforeExactlyToday);
  TestValidator.equals(
    "boundary condition (created_before equal) - count",
    resultBeforeExactlyToday.data.length,
    2,
  );
  TestValidator.predicate("today notification included (boundary)", () =>
    resultBeforeExactlyToday.data
      .map((item) => item.notification_id)
      .includes(todayNotification.queue_id),
  );
}