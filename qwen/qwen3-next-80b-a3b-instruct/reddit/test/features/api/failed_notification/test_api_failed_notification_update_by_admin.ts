import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotification";
import type { ICommunityPlatformFailedNotificationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotificationMetadata";
import { prepare_random_community_platform_failed_notification } from "../../../prepare/prepare_random_community_platform_failed_notification";
import { generate_random_community_platform_failed_notifications_create } from "../../../generate/generate_random_community_platform_failed_notifications_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_failed_notification_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated with authorization token
  // Step 2: Create a failed notification record
  const failedNotification =
    await generate_random_community_platform_failed_notifications_create(
      adminConnection,
      {
        body: {
          notification_event_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Email bounced due to invalid address",
          details: "SMTP error 550: User unknown",
        } satisfies ICommunityPlatformFailedNotification.ICreate,
      },
    );
  typia.assert(failedNotification);
  // Step 3: Update the failed notification with resolved status and metadata
  const updatedNotification =
    await api.functional.communityPlatform.admin.failed_notifications.update(
      adminConnection,
      {
        failedId: failedNotification.id,
        body: {
          // IUpdate is empty, but we're testing that it's accepted and processed
        } satisfies ICommunityPlatformFailedNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Step 4: Validate the update results
  TestValidator.equals(
    "status changed to resolved",
    updatedNotification.status,
    "resolved",
  );
  TestValidator.equals(
    "failed_at preserved",
    updatedNotification.failed_at,
    failedNotification.failed_at,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedNotification.created_at,
    failedNotification.created_at,
  );
  TestValidator.predicate(
    "updated_at has changed",
    () => updatedNotification.updated_at > failedNotification.updated_at,
  );
  TestValidator.equals(
    "id preserved",
    updatedNotification.id,
    failedNotification.id,
  );
  TestValidator.equals(
    "notification_event_id preserved",
    updatedNotification.notification_event_id,
    failedNotification.notification_event_id,
  );
  TestValidator.equals(
    "recipient_id preserved",
    updatedNotification.recipient_id,
    failedNotification.recipient_id,
  );
  TestValidator.equals(
    "recipient_type preserved",
    updatedNotification.recipient_type,
    failedNotification.recipient_type,
  );
  TestValidator.equals(
    "delivery_channel preserved",
    updatedNotification.delivery_channel,
    failedNotification.delivery_channel,
  );
  TestValidator.equals(
    "failure_reason preserved",
    updatedNotification.failure_reason,
    failedNotification.failure_reason,
  );
  TestValidator.equals(
    "retry_count preserved",
    updatedNotification.retry_count,
    failedNotification.retry_count,
  );
  TestValidator.equals(
    "reason_code preserved",
    updatedNotification.reason_code,
    failedNotification.reason_code,
  );
  TestValidator.equals(
    "error_source preserved",
    updatedNotification.error_source,
    failedNotification.error_source,
  );
  TestValidator.equals(
    "resolved_at set",
    updatedNotification.resolved_at !== null,
    true,
  );
  TestValidator.equals(
    "metadata unchanged",
    updatedNotification.metadata,
    failedNotification.metadata,
  );
  // Step 5: Verify that resolving the notification again is allowed (idempotent)
  const secondUpdate =
    await api.functional.communityPlatform.admin.failed_notifications.update(
      adminConnection,
      {
        failedId: failedNotification.id,
        body: {},
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "status remains resolved after second update",
    secondUpdate.status,
    "resolved",
  );
  TestValidator.equals(
    "resolved_at unchanged after second update",
    secondUpdate.resolved_at,
    updatedNotification.resolved_at,
  );
  TestValidator.predicate(
    "updated_at advanced after second update",
    () => secondUpdate.updated_at > updatedNotification.updated_at,
  );
}
