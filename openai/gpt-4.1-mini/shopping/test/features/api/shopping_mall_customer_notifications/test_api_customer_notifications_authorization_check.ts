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

export async function test_api_customer_notifications_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup a base connection from the base host
  const baseConnection: api.IConnection = { host: connection.host };
  // 2. Attempt to call notifications index endpoint without authorization
  // Expect an HTTP 401 Unauthorized error to confirm that access control is enforced
  await TestValidator.httpError(
    "unauthorized access without auth",
    401,
    async () => {
      await api.functional.shoppingMall.customer.notifications.index(
        baseConnection,
        { body: {} },
      );
    },
  );
  // 3. Customer join to authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
    },
  });
  // 4. After join, the authorize_customer_join function sets Authorization header
  //    internally on customerConnection
  // 5. Call notifications index endpoint with authenticated connection to get notifications
  const notifications =
    await api.functional.shoppingMall.customer.notifications.index(
      customerConnection,
      {
        body: {},
      },
    );
  // 6. Validate the returned notifications object structure
  typia.assert(notifications);
}
