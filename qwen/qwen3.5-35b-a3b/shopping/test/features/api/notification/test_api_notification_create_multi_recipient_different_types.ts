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

export async function test_api_notification_create_multi_recipient_different_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate UUIDs for three recipients (customer, seller, superAdmin)
  const customerRecipientId = typia.random<string & tags.Format<"uuid">>();
  const sellerRecipientId = typia.random<string & tags.Format<"uuid">>();
  const superAdminRecipientId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create notification with multi-recipient different types
  // Note: IDeliver contains title, body, type AND its own recipients array
  const notificationTitle = RandomGenerator.paragraph({ sentences: 2 });
  const notificationBody = RandomGenerator.content({ paragraphs: 2 });
  const createBody: IEcommerceMallNotification.ICreate = {
    title: notificationTitle,
    body: notificationBody,
    type: "seller_approval",
    recipients: [
      {
        title: notificationTitle,
        body: notificationBody,
        type: "seller_approval",
        recipients: [
          {
            recipient_type: "customer",
            recipient_id: customerRecipientId,
          },
          {
            recipient_type: "seller",
            recipient_id: sellerRecipientId,
          },
          {
            recipient_type: "superAdmin",
            recipient_id: superAdminRecipientId,
          },
        ],
      },
    ],
  };
  // 4. Create notification using SDK
  const notification =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(notification);
  // 5. Validate notification response
  TestValidator.equals(
    "notification type",
    notification.type,
    "seller_approval",
  );
  TestValidator.equals(
    "notification title",
    notification.title,
    notificationTitle,
  );
  TestValidator.equals(
    "notification body",
    notification.body,
    notificationBody,
  );
  TestValidator.equals("notification status", notification.status, "unread");
  TestValidator.predicate(
    "notification has UUID id",
    /^[0-9a-f-]{36}$/i.test(notification.id),
  );
  // 6. Validate recipients structure
  // recipients array in ICreate is IDeliver[], each IDeliver has its own recipients array
  TestValidator.equals(
    "delivery recipients count",
    createBody.recipients.length,
    1,
  );
  TestValidator.equals(
    "IDeliver recipients count",
    createBody.recipients[0].recipients.length,
    3,
  );
  TestValidator.equals(
    "first recipient type",
    createBody.recipients[0].recipients[0].recipient_type,
    "customer",
  );
  TestValidator.equals(
    "second recipient type",
    createBody.recipients[0].recipients[1].recipient_type,
    "seller",
  );
  TestValidator.equals(
    "third recipient type",
    createBody.recipients[0].recipients[2].recipient_type,
    "superAdmin",
  );
  // 7. Validate each recipient has valid UUID format
  typia.assert<string & tags.Format<"uuid">>(customerRecipientId);
  typia.assert<string & tags.Format<"uuid">>(sellerRecipientId);
  typia.assert<string & tags.Format<"uuid">>(superAdminRecipientId);
}
