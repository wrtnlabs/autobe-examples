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

export async function test_api_customer_notification_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 2: Customer A setup (will attempt unauthorized access)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAPassword = RandomGenerator.alphaNumeric(16);
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerA);
  await authorize_customer_login(customerAConnection, {
    body: {
      email: customerA.email,
      password: customerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Step 3: Customer B setup (will receive notification)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBPassword = RandomGenerator.alphaNumeric(16);
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerB);
  await authorize_customer_login(customerBConnection, {
    body: {
      email: customerB.email,
      password: customerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Step 4: Admin creates notification for Customer B
  const notification =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.paragraph({ sentences: 5 }),
          type: "platform_announcement",
          recipients: [
            {
              title: RandomGenerator.paragraph({ sentences: 2 }),
              body: RandomGenerator.paragraph({ sentences: 5 }),
              type: "platform_announcement",
              recipients: [
                {
                  recipient_type: "customer",
                  recipient_id: customerB.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Step 5: Customer A attempts to access Customer B's notification
  await TestValidator.error(
    "Customer A cannot access Customer B's notification",
    async () => {
      await api.functional.ecommerceMall.customer.notifications.at(
        customerAConnection,
        {
          notificationId: notification.id,
        },
      );
    },
  );
}
