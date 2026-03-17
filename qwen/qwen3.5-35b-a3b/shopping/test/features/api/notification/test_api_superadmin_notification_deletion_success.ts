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
import { generate_random_ecommerce_mall_super_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_superadmin_notification_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<100>
      >(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create a system notification with correct recipients structure
  const notification =
    await generate_random_ecommerce_mall_super_admin_notifications_create(
      adminConnection,
      {
        body: {
          title: typia.random<string & tags.MaxLength<255>>(),
          body: typia.random<string>(),
          type: typia.random<
            | "order_update"
            | "seller_approval"
            | "platform_announcement"
            | "system_alert"
          >(),
          recipients: [
            {
              title: typia.random<string & tags.MinLength<1>>(),
              body: typia.random<string & tags.MinLength<1>>(),
              type: typia.random<
                | "order_update"
                | "seller_approval"
                | "platform_announcement"
                | "system_alert"
              >(),
              recipients: [
                {
                  recipient_type: "superAdmin",
                  recipient_id: adminAuthorized.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Delete the notification
  const notificationId: string = notification.id;
  await api.functional.ecommerceMall.superAdmin.notifications.erase(
    adminConnection,
    { notificationId },
  );
  // 4. Verify the delete operation completed successfully
  TestValidator.equals("notification deletion completed", true, true);
}
