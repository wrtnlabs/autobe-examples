import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test behavior when requesting a non-existent user notification by notificationId.
  // 1. Preconditions: A customer is registered and logged in.
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  customerConnection.headers = { Authorization: joined.token.access };
  typia.assert(joined);
  // 2. Action: Call GET /shoppingMall/customer/userNotifications/{notificationId} with random UUID
  const randomNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Assertion: Expect HTTP 404 Not Found error with notification does not exist message
  await TestValidator.httpError(
    "non-existent user notification returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.at(
        customerConnection,
        { notificationId: randomNotificationId },
      );
    },
  );
  // 4. Cleanup: Delete created customer account if any (No API provided for deletion; ignored here)
}
