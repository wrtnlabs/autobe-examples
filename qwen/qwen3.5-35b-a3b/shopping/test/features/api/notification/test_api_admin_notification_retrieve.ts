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
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_admin_notification_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(admin);
  // 2. Create test notification
  const notification: IEcommerceMallNotification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(notification);
  // 3. Retrieve notification by ID
  const retrieved: IEcommerceMallNotification =
    await api.functional.ecommerceMall.admin.notifications.at(adminConnection, {
      notificationId: notification.id,
    });
  typia.assert(retrieved);
  // 4. Validate all required fields exist
  TestValidator.equals(
    "notification id matches",
    retrieved.id,
    notification.id,
  );
  TestValidator.equals(
    "notification title matches",
    retrieved.title,
    notification.title,
  );
  TestValidator.equals(
    "notification body matches",
    retrieved.body,
    notification.body,
  );
  TestValidator.equals(
    "notification type matches",
    retrieved.type,
    notification.type,
  );
  TestValidator.equals(
    "notification status is unread",
    retrieved.status,
    "unread",
  );
  TestValidator.equals(
    "notification created_at exists",
    retrieved.created_at,
    notification.created_at,
  );
  TestValidator.equals(
    "notification updated_at exists",
    retrieved.updated_at,
    notification.updated_at,
  );
  TestValidator.equals(
    "notification deleted_at is null",
    retrieved.deleted_at,
    notification.deleted_at,
  );
}
