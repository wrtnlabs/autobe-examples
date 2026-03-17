import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_seller_notification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Admin creates notification for seller
  const notification =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminConnection,
      {
        body: {
          title: "Order Shipped",
          body: "Your order #12345 has been shipped via UPS",
          type: "order_update",
          recipients: [
            {
              title: "Seller Notification",
              body: "You have a new order update",
              type: "order_update",
              recipients: [
                {
                  recipient_id: seller.id,
                },
              ],
            } as IEcommerceMallNotification.IDeliver,
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 4. Seller retrieves the notification
  const retrievedNotification =
    await api.functional.ecommerceMall.seller.notifications.at(
      sellerConnection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(retrievedNotification);
  // 5. Validate response fields
  TestValidator.equals(
    "notification id matches",
    retrievedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "title matches",
    retrievedNotification.title,
    "Order Shipped",
  );
  TestValidator.equals(
    "body matches",
    retrievedNotification.body,
    "Your order #12345 has been shipped via UPS",
  );
  TestValidator.equals(
    "type is order_update",
    retrievedNotification.type,
    "order_update",
  );
  TestValidator.equals(
    "status is unread",
    retrievedNotification.status,
    "unread",
  );
  TestValidator.notEquals(
    "has created_at",
    retrievedNotification.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "has updated_at",
    retrievedNotification.updated_at,
    undefined,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedNotification.deleted_at,
    null,
  );
}