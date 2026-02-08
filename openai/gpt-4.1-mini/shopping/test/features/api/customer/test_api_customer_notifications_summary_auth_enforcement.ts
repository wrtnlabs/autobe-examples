import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
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

export async function test_api_customer_notifications_summary_auth_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // This test ensures that the notification summary endpoint enforces authorization.
  // 1. Prepare a base connection without any authorization headers
  const baseConnection: api.IConnection = { host: connection.host };
  // 2. Attempt to call the notification summary endpoint without authentication
  await TestValidator.httpError(
    "should reject unauthenticated access",
    401,
    async () => {
      await api.functional.shoppingMall.customer.notifications.summary.index(
        baseConnection,
      );
    },
  );
  // 3. Perform customer join and authorize the connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 4. Honest call with valid authorization must succeed
  const summary =
    await api.functional.shoppingMall.customer.notifications.summary.index(
      customerConnection,
    );
  typia.assert(summary);
}
