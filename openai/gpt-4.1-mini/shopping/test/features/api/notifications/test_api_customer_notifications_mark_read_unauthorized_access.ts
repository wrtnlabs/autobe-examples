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

export async function test_api_customer_notifications_mark_read_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as customer #1
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  customer1Connection.headers = {
    Authorization: `Bearer ${customer1Auth.token.access}`,
  };
  // Authenticate as customer #2
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  customer2Connection.headers = {
    Authorization: `Bearer ${customer2Auth.token.access}`,
  };
  // Attempt customer #1 marking some notification IDs that belong to customer #2 or do not exist
  const fakeNotificationIds: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(), // Random UUID that does not exist
    typia.random<string & tags.Format<"uuid">>(), // Random UUID that does not belong to customer #1
  ];
  // Use customer #1 connection to try marking these notifications as read
  await TestValidator.httpError(
    "customer attempts to mark notifications as read that do not belong to them",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.notifications.read.markRead(
        customer1Connection,
        {
          body: {
            notificationIds: fakeNotificationIds,
          } satisfies IShoppingMallUserNotification.IMarkRead,
        },
      );
    },
  );
}
