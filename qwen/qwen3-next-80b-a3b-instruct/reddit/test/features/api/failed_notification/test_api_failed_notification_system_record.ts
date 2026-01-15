import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotification";
import type { ICommunityPlatformFailedNotificationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotificationMetadata";
import { prepare_random_community_platform_failed_notification } from "../../../prepare/prepare_random_community_platform_failed_notification";
import { generate_random_community_platform_failed_notifications_create } from "../../../generate/generate_random_community_platform_failed_notifications_create";
export async function test_api_failed_notification_system_record(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Step 2: Use the generation function for existing endpoint
  // Generation function handles connection isolation and authorization internally
  const failedNotification =
    await generate_random_community_platform_failed_notifications_create(
      actorConnection,
      {
        body: {
          notification_event_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "PUSH_TOKEN_EXPIRED",
          details:
            "Push token renewal failed, client device did not refresh token",
        } satisfies ICommunityPlatformFailedNotification.ICreate,
      },
    );
  // Step 3: Validate all types using typia.assert - this validates ALL format, structure, and type constraints
  typia.assert(failedNotification);
  // Step 4: Validate business logic and allowed values
  TestValidator.predicate(
    "recipient_type is one of 'member', 'guest', or 'admin'",
    ["member", "guest", "admin"].includes(failedNotification.recipient_type),
  );
  TestValidator.predicate(
    "delivery_channel is one of 'email', 'push', or 'sms'",
    ["email", "push", "sms"].includes(failedNotification.delivery_channel),
  );
  TestValidator.predicate(
    "retry_count is between 0 and 5 inclusive",
    failedNotification.retry_count >= 0 && failedNotification.retry_count <= 5,
  );
  TestValidator.equals(
    "status is 'failed' by default",
    failedNotification.status,
    "failed",
  );
  TestValidator.equals(
    "resolved_at is undefined for new failed notifications",
    failedNotification.resolved_at,
    undefined,
  );
  TestValidator.predicate(
    "error_source is one of 'external_service', 'internal_system', 'network', or 'client'",
    ["external_service", "internal_system", "network", "client"].includes(
      failedNotification.error_source,
    ),
  );
}
