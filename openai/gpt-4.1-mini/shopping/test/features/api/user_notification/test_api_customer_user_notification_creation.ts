import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_customer_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_customer_user_notification_creation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Create user notification successfully for a customer user without optional url and image_url
  const customerConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_customer_join(customerConnection1, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "P@ssw0rd123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection1.headers = { Authorization: authorized1.token.access };
  const notification1 =
    await generate_random_shopping_mall_customer_user_notifications_create_user_notification(
      customerConnection1,
      {
        body: {
          notification_template_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "customer",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(notification1);
  // Removed all invalid property checks: owner_type, is_read, delivered_at, read_at

  // Scenario 2: Create user notification with optional url and image_url explicitly null
  const customerConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_customer_join(customerConnection2, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.org`,
      password: "P@ssw0rd456",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection2.headers = { Authorization: authorized2.token.access };
  const notification2 =
    await generate_random_shopping_mall_customer_user_notifications_create_user_notification(
      customerConnection2,
      {
        body: {
          notification_template_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "customer",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 2 }),
          url: null,
          image_url: null,
        },
      },
    );
  typia.assert(notification2);
  // Removed all invalid property checks: owner_type, is_read, delivered_at, read_at
}
