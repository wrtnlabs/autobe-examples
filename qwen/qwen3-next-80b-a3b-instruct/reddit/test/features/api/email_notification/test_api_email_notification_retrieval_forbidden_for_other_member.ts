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
export async function test_api_email_notification_retrieval_forbidden_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account to create the notification
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: member1Password,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create second member account to attempt unauthorized access
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: member2Password,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 3: Create email notification queue entry for first member (using admin role)
  // Set up admin connection for creating the notification
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Must login admin to ensure connection has valid auth token
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail, // Use the email we created and stored for admin
      password: "temporaryPassword123", // Admin join password not exposed, must use generated from admin join
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create the notification queue entry as admin
  const notification =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: member1.email,
          subject: "Test Notification",
          content: "This is a test email notification",
          priority: "normal",
          retry_count: 3,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(notification);
  // Step 4: Attempt to retrieve the notification queue entry with second member's credentials
  // This should fail with 403 Forbidden as member2 is not the owner of the notification
  // Create a connection for member2 and try to access the notification
  const member2AttemptConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member2AttemptConnection, {
    body: {
      email: member2.email,
      password: member2Password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Try to read the notification with member2's connection - should throw 403 Forbidden
  await TestValidator.error(
    "member cannot access another member's notification",
    async () => {
      await api.functional.communityPlatform.member.email_notification_queue.at(
        member2AttemptConnection,
        {
          queueId: notification.queue_id,
        },
      );
    },
  );
}