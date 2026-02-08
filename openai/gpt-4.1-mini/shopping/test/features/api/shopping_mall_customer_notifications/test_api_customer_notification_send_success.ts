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

export async function test_api_customer_notification_send_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and obtain authorized connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create customer connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Send notification with empty body due to schema definition
  const body = {} satisfies IShoppingMallUserNotification.ISendRequest;
  const response =
    await api.functional.shoppingMall.customer.notifications.send.sendNotification(
      customerConnection,
      { body },
    );
  typia.assert(response);
}
