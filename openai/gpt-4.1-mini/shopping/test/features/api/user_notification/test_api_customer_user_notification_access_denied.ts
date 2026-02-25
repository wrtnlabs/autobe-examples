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

export async function test_api_customer_user_notification_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A join and authorize
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(customerA);
  customerAConnection.headers = {
    Authorization: customerA.token.access,
  };
  // 2. Customer B join and authorize
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(customerB);
  customerBConnection.headers = {
    Authorization: customerB.token.access,
  };
  // 3. Create a notification ID that supposedly belongs to customer A
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to access this notification as customer B - expect 403 Forbidden error
  await TestValidator.httpError(
    "access denied for customer B to customer A's notification",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.at(
        customerBConnection,
        { notificationId },
      );
    },
  );
}
