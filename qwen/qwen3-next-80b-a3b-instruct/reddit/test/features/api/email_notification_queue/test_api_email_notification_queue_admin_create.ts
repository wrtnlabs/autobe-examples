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
export async function test_api_email_notification_queue_admin_create(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create email notification with all required fields
  const notification =
    await api.functional.communityPlatform.admin.email_notification_queue.create(
      adminConnection,
      {
        body: {
          recipient_email: email,
          subject: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 8,
          }),
          priority: RandomGenerator.pick(["low", "normal", "high"] as const),
          retry_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
        } satisfies ICommunityPlatformEmailNotificationQueue.ICreate,
      },
    );
  // Step 3: Validate response structure and business rule
  typia.assert(notification);
  TestValidator.equals(
    "status should be pending",
    notification.status,
    "pending",
  );
}
