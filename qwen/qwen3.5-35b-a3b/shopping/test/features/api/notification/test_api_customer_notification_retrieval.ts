import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_customer_notification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Admin creates notification delivered to customer
  const notification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {
          title: "Welcome to E-Commerce Mall",
          body: "Thank you for registering. Explore our amazing products!",
          type: "platform_announcement",
          recipients: [
            {
              title: "Customer",
              body: "Customer recipient",
              type: "platform_announcement",
              recipients: [
                {
                  recipient_type: "customer" as const,
                  recipient_id: customer.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 4. Customer retrieves the notification
  const retrieved =
    await api.functional.ecommerceMall.customer.notifications.at(
      customerConnection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response
  TestValidator.equals(
    "notification ID matches",
    retrieved.id,
    notification.id,
  );
  TestValidator.equals(
    "notification title matches",
    retrieved.title,
    "Welcome to E-Commerce Mall",
  );
  TestValidator.equals(
    "notification body matches",
    retrieved.body,
    "Thank you for registering. Explore our amazing products!",
  );
  TestValidator.equals(
    "notification type matches",
    retrieved.type,
    "platform_announcement",
  );
  TestValidator.equals(
    "notification status is unread",
    retrieved.status,
    "unread",
  );
  TestValidator.predicate(
    "notification has created_at timestamp",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "notification has updated_at timestamp",
    retrieved.updated_at !== undefined,
  );
  TestValidator.equals(
    "notification deleted_at is null",
    retrieved.deleted_at,
    null,
  );
}