import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_system_alert_delivery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoinResult);
  // 2. Create admin connection for notification delivery
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminJoinResult.token.access;
  // 3. Deliver system_alert notification to admin
  const notification =
    await api.functional.ecommerceMall.admin.notifications.deliver(
      adminConnection,
      {
        body: {
          title: "Database Maintenance Required",
          body: RandomGenerator.paragraph({ sentences: 3 }),
          type: "system_alert",
          recipients: [
            {
              recipient_type: "admin" as const,
              recipient_id: adminJoinResult.id,
            },
          ],
        } satisfies IEcommerceMallNotification.IDeliver,
      },
    );
  typia.assert(notification);
  // 4. Validate notification business logic fields
  TestValidator.equals(
    "notification type is system_alert",
    notification.type,
    "system_alert",
  );
  TestValidator.equals(
    "notification status is unread",
    notification.status,
    "unread",
  );
  TestValidator.equals(
    "notification title matches",
    notification.title,
    "Database Maintenance Required",
  );
  TestValidator.predicate(
    "notification body has content",
    notification.body.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(notification.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(notification.updated_at),
  );
  TestValidator.predicate(
    "notification ID is non-empty string",
    notification.id.length > 0,
  );
  TestValidator.notEquals(
    "created_at and updated_at differ",
    notification.created_at,
    notification.updated_at,
  );
  // 5. Validate notification ID format (basic check, not full regex)
  TestValidator.predicate(
    "notification ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      notification.id,
    ),
  );
}