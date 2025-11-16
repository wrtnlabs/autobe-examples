import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityNotification";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test notification isolation between different member accounts.
 *
 * This test ensures strict notification privacy by verifying that members can
 * only access their own notifications. Creates two independent member accounts
 * and validates that each member's notification query returns only their own
 * notifications, preventing unauthorized access to other members' notification
 * streams.
 *
 * The test validates:
 *
 * 1. Member A registration and authentication
 * 2. Member B registration and authentication
 * 3. Member A can retrieve notifications (authenticated as Member A)
 * 4. Member B can retrieve notifications (authenticated as Member B)
 * 5. Each member's notification stream is properly isolated
 * 6. JWT-based authorization context ensures privacy
 */
export async function test_api_notification_member_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first member account (Member A)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();

  const memberAData = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberAEmail,
    password: memberAPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.jpg`,
    show_online_status: true,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: `https://example.com/register/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/home/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IRedditCommunityGuest.ICreate;

  const memberA: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAData,
    });
  typia.assert(memberA);

  TestValidator.equals("member A email matches", memberA.email, memberAEmail);
  TestValidator.equals(
    "member A username matches",
    memberA.username,
    memberAData.username,
  );

  // Step 2: Create and authenticate second member account (Member B)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();

  const memberBData = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberBEmail,
    password: memberBPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.jpg`,
    show_online_status: false,
    show_subscribed_communities: true,
    show_activity_feed: true,
    ip: "192.168.1.101",
    href: `https://example.com/register/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/home/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IRedditCommunityGuest.ICreate;

  const memberB: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBData,
    });
  typia.assert(memberB);

  TestValidator.equals("member B email matches", memberB.email, memberBEmail);
  TestValidator.equals(
    "member B username matches",
    memberB.username,
    memberBData.username,
  );
  TestValidator.notEquals("members have different IDs", memberA.id, memberB.id);

  // Step 3: Retrieve notifications for Member A (authenticated as Member A)
  // The join operation automatically sets the Authorization header with Member A's token
  const notificationsRequestA = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityNotification.IRequest;

  const notificationsA: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: notificationsRequestA,
      },
    );
  typia.assert(notificationsA);

  // Verify all notifications belong to Member A
  for (const notification of notificationsA.data) {
    TestValidator.equals(
      "notification belongs to member A",
      notification.recipient_id,
      memberA.id,
    );
  }

  // Step 4: Switch to Member B context and retrieve notifications
  // Since memberB registration also set the Authorization header, the connection
  // is already authenticated as Member B
  const notificationsRequestB = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityNotification.IRequest;

  const notificationsB: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: notificationsRequestB,
      },
    );
  typia.assert(notificationsB);

  // Verify all notifications belong to Member B
  for (const notification of notificationsB.data) {
    TestValidator.equals(
      "notification belongs to member B",
      notification.recipient_id,
      memberB.id,
    );
  }

  // Step 5: Validate strict isolation - no overlap between notification streams
  const memberANotificationIds = new Set(notificationsA.data.map((n) => n.id));
  const memberBNotificationIds = new Set(notificationsB.data.map((n) => n.id));

  for (const notificationId of memberANotificationIds) {
    TestValidator.predicate(
      "member A notification not in member B stream",
      !memberBNotificationIds.has(notificationId),
    );
  }

  for (const notificationId of memberBNotificationIds) {
    TestValidator.predicate(
      "member B notification not in member A stream",
      !memberANotificationIds.has(notificationId),
    );
  }
}
