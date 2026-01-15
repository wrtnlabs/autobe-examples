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
import { prepare_random_community_platform_email_notification_queue } from "../../../prepare/prepare_random_community_platform_email_notification_queue";
import { generate_random_community_platform_admin_email_notification_queue_create } from "../../../generate/generate_random_community_platform_admin_email_notification_queue_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_email_notification_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function's pattern
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // adminConnection.headers is now updated internally by authorize_admin_join function
  // Create a new email notification
  const notification: ICommunityPlatformEmailNotificationQueue =
    await generate_random_community_platform_admin_email_notification_queue_create(
      adminConnection,
      {
        body: {
          recipient_email: typia.random<string & tags.Format<"email">>(),
          subject: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          priority: "normal",
          retry_count: 2,
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  typia.assert(notification);
  // Retrieve the notification by queueId
  const retrievedNotification: ICommunityPlatformEmailNotificationQueue =
    await api.functional.communityPlatform.admin.email_notification_queue.at(
      adminConnection,
      {
        queueId: notification.queue_id,
      },
    );
  typia.assert(retrievedNotification);
  // Validate all metadata fields are present and correct
  TestValidator.equals(
    "recipient email matches",
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
    "status is pending",
    retrievedNotification.status,
    "pending",
  );
  TestValidator.equals(
    "delivery attempts starts at 0",
    retrievedNotification.delivery_attempts,
    0,
  );
  TestValidator.equals(
    "delivery timestamp is null when pending",
    retrievedNotification.delivery_timestamp,
    null,
  );
}
