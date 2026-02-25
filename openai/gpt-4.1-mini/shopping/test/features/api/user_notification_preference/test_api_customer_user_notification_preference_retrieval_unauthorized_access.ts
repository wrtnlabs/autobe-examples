import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_customer_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_customer_user_notification_preference_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate and create a user notification preference as customer A.
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  // 2. Create a notification preference as customer A
  const userNotificationPreference =
    await generate_random_shopping_mall_customer_user_notification_preferences_create(
      customerAConnection,
      {
        body: {
          customerId: customerA.id,
          channelName: "email",
          notificationType: "order_update",
          isEnabled: true,
        },
      },
    );
  typia.assert(userNotificationPreference);
  // 3. Authenticate as customer B.
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  // 4. Attempt to retrieve customer A's notification preference by preferenceId using customer B
  await TestValidator.httpError(
    "unauthorized access to other user's notification preference",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.at(
        customerBConnection,
        {
          preferenceId: userNotificationPreference.id,
        },
      );
    },
  );
}
