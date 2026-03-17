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

export async function test_api_notification_create_single_recipient(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
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
  // 2. Customer setup - create customer account to serve as notification recipient
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 3. Admin creates notification with customer as single recipient
  const notification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          type: "platform_announcement",
          recipients: [
            {
              title: RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 3,
                wordMax: 7,
              }),
              body: RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 5,
                sentenceMax: 10,
              }),
              type: "platform_announcement",
              recipients: [
                {
                  recipient_type: "customer" as const,
                  recipient_id: customer.id,
                },
              ],
            },
          ],
        },
      },
    );
  typia.assert(notification);
  // 4. Validate notification creation
  TestValidator.equals(
    "notification type",
    notification.type,
    "platform_announcement",
  );
  TestValidator.equals("notification status", notification.status, "unread");
  TestValidator.predicate(
    "notification has valid id",
    (): boolean => notification.id !== undefined,
  );
}
