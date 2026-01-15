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
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_email_notification_queue } from "../../../prepare/prepare_random_community_platform_email_notification_queue";
import { generate_random_community_platform_admin_email_notification_queue_create } from "../../../generate/generate_random_community_platform_admin_email_notification_queue_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_email_notification_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection for admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create connection for member and authenticate, storing the member's email
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create email notification as admin for the member
  const notification =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: memberEmail,
          subject: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          priority: "high",
          retry_count: 3,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(notification);
  // Step 4: Retrieve the notification as the member with correct queueId
  const retrievedNotification =
    await api.functional.communityPlatform.member.email_notification_queue.at(
      memberConnection,
      {
        queueId: notification.queue_id,
      },
    );
  typia.assert(retrievedNotification);
  // Step 5: Validate the retrieved notification matches the created one
  TestValidator.equals(
    "queue_id matches",
    retrievedNotification.queue_id,
    notification.queue_id,
  );
  TestValidator.equals(
    "recipient_email matches",
    retrievedNotification.recipient_email,
    notification.recipient_email,
  );
  TestValidator.equals(
    "subject matches",
    retrievedNotification.subject,
    notification.subject,
  );
  TestValidator.equals(
    "content matches",
    retrievedNotification.content,
    notification.content,
  );
  TestValidator.equals(
    "status matches",
    retrievedNotification.status,
    notification.status,
  );
  TestValidator.equals(
    "delivery_attempts matches",
    retrievedNotification.delivery_attempts,
    notification.delivery_attempts,
  );
  // Step 6: Verify member cannot access notifications belonging to other users
  // Create a second member's email and connection
  const differentMemberEmail = typia.random<string & tags.Format<"email">>();
  const differentMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(differentMemberConnection, {
    body: {
      email: differentMemberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create notification for different member
  const differentNotification =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: differentMemberEmail,
          subject: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          priority: "high",
          retry_count: 3,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(differentNotification);
  // Member should not be able to access notification for different member
  await TestValidator.error(
    "member cannot access notification belonging to another member",
    async () => {
      await api.functional.communityPlatform.member.email_notification_queue.at(
        memberConnection,
        {
          queueId: differentNotification.queue_id,
        },
      );
    },
  );
}
