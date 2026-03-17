import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_super_admin_notification_view_others(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResult = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminResult);
  // 2. Register customer who will receive notification
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerResult);
  // 3. Register admin who will create notification
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminResult);
  // 4. Create notification assigned to customer using admin
  const createdNotification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {
          recipients: [
            {
              title: RandomGenerator.name(3),
              body: RandomGenerator.paragraph({ sentences: 5 }),
              type: "order_update",
              recipients: [
                {
                  recipient_type: "customer",
                  recipient_id: customerResult.id,
                },
              ],
            },
          ],
        },
      },
    );
  typia.assert(createdNotification);
  // 5. Retrieve notification as super administrator (platform oversight)
  const superAdminNotification =
    await api.functional.ecommerceMall.superAdmin.notifications.at(
      superAdminConnection,
      {
        notificationId: createdNotification.id,
      },
    );
  typia.assert(superAdminNotification);
  // 6. Validate super admin can view customer's notification
  TestValidator.equals(
    "notification id matches",
    superAdminNotification.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notification title matches",
    superAdminNotification.title,
    createdNotification.title,
  );
  TestValidator.equals(
    "notification body matches",
    superAdminNotification.body,
    createdNotification.body,
  );
  TestValidator.equals(
    "notification type matches assigned type",
    superAdminNotification.type,
    "order_update",
  );
  TestValidator.equals(
    "notification status is unread",
    superAdminNotification.status,
    "unread",
  );
  TestValidator.predicate(
    "super admin has platform oversight access to customer notification",
    () => superAdminNotification.id !== undefined,
  );
}
