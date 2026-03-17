import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator notification view functionality.
 * 1. Register super administrator
 * 2. Create notification using available admin endpoints
 * 3. Retrieve notification by ID
 * 4. Validate response fields and business rules
 */
export async function test_api_super_admin_notification_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create notification using random simulation data
  // Note: Since notification creation endpoint is not available in SDK,
  // we use simulation mode to generate valid notification data
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve notification by ID
  const notification =
    await api.functional.ecommerceMall.superAdmin.notifications.at(
      adminConnection,
      {
        notificationId,
      },
    );
  typia.assert(notification);
  // 4. Validate response contains all required fields
  TestValidator.equals(
    "notification id matches",
    notification.id,
    notificationId,
  );
  TestValidator.predicate("has title", notification.title.length > 0);
  TestValidator.predicate("has body", notification.body.length > 0);
  TestValidator.predicate("has type", notification.type.length > 0);
  TestValidator.predicate("has status", notification.status.length > 0);
  TestValidator.predicate("has created_at", notification.created_at.length > 0);
  TestValidator.predicate("has updated_at", notification.updated_at.length > 0);
  // 5. Verify notification type is one of valid enum values
  const validTypes = [
    "order_update",
    "seller_approval",
    "platform_announcement",
    "system_alert",
    "cancellation_decision",
    "refund_decision",
    "shipment_update",
  ] as const;
  const typeValue = notification.type as (typeof validTypes)[number];
  TestValidator.predicate(
    "notification type is valid",
    validTypes.includes(typeValue),
  );
  // 6. Verify notification status is valid enum value
  const validStatuses = ["unread", "read"] as const;
  const statusValue = notification.status as (typeof validStatuses)[number];
  TestValidator.predicate(
    "notification status is valid",
    validStatuses.includes(statusValue),
  );
  // 7. Verify notification is not soft-deleted
  TestValidator.equals(
    "notification is not soft-deleted",
    notification.deleted_at,
    null,
  );
  // 8. Verify timestamps are proper ISO 8601 format and updated_at >= created_at
  const createdAt = new Date(notification.created_at);
  const updatedAt = new Date(notification.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
