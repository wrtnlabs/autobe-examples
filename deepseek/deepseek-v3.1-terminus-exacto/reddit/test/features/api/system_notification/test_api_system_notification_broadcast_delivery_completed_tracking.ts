import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemNotificationBroadcastDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotificationBroadcastDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of completed broadcast delivery tracking information.
 *
 * As an administrator monitoring system-wide notifications, this test verifies
 * that administrators can access comprehensive delivery metrics including total
 * recipients, delivered counts, failed counts, and delivery timestamps for a
 * completed broadcast notification delivery.
 */
export async function test_api_system_notification_broadcast_delivery_completed_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Note: Since we cannot create system notifications and broadcast deliveries
  // through the available API functions (no creation endpoints provided),
  // we'll test the retrieval functionality with valid UUIDs that would
  // represent existing completed deliveries in a real scenario.
  // Generate valid UUIDs that would represent existing entities
  const systemNotificationId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the broadcast delivery tracking information
  const delivery =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
      adminConnection,
      {
        systemNotificationId,
        deliveryId,
      },
    );
  typia.assert(delivery);
  // Validate the delivery tracking information structure
  TestValidator.equals("delivery ID matches", delivery.id, deliveryId);
  TestValidator.equals(
    "system notification ID matches",
    delivery.system_notification_id,
    systemNotificationId,
  );
  TestValidator.predicate(
    "delivery status is valid string",
    typeof delivery.delivery_status === "string",
  );
  TestValidator.predicate(
    "total recipients is non-negative integer",
    delivery.total_recipients >= 0,
  );
  TestValidator.predicate(
    "delivered count is non-negative integer",
    delivery.delivered_count >= 0,
  );
  TestValidator.predicate(
    "failed count is non-negative integer",
    delivery.failed_count >= 0,
  );
  // Validate logical consistency of delivery metrics
  TestValidator.predicate(
    "delivered count <= total recipients",
    delivery.delivered_count <= delivery.total_recipients,
  );
  TestValidator.predicate(
    "failed count <= total recipients",
    delivery.failed_count <= delivery.total_recipients,
  );
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(delivery.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(delivery.updated_at),
  );
  // Validate nullable timestamp fields
  if (delivery.scheduled_at !== null) {
    TestValidator.predicate(
      "scheduled_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(delivery.scheduled_at),
    );
  }
  if (delivery.started_at !== null) {
    TestValidator.predicate(
      "started_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(delivery.started_at),
    );
  }
  if (delivery.completed_at !== null) {
    TestValidator.predicate(
      "completed_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(delivery.completed_at),
    );
  }
  // Validate error_message field
  if (delivery.error_message !== null) {
    TestValidator.predicate(
      "error_message is valid string",
      typeof delivery.error_message === "string",
    );
  }
}
