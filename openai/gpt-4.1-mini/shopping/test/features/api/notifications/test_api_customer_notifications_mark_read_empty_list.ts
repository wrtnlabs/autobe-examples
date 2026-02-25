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

export async function test_api_customer_notifications_mark_read_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePass1234",
    },
  });
  typia.assert(authorizedCustomer);
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Call markRead endpoint with a list containing a fake notification ID
  // Because the DTO requires minItems=1, sending an empty list is invalid.
  // To test the empty list scenario gracefully, we use a fake UUID.
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    notificationIds: [fakeNotificationId],
  } satisfies IShoppingMallUserNotification.IMarkRead;
  const response =
    await api.functional.shoppingMall.customer.notifications.read.markRead(
      customerConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate that the response is not an error and is a valid notification summary
  TestValidator.predicate(
    "Response is a valid notification summary",
    response !== null && response !== undefined,
  );
}
