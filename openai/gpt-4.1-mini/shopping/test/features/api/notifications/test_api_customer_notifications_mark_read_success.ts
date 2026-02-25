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

export async function test_api_customer_notifications_mark_read_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
    },
  });
  typia.assert(authorized);
  // Use customerConnection for subsequent calls with Authorization header
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Fetch existing notifications if possible
  // Since no GET endpoint provided in inputs, simulate with one notification id from read response call
  // 3. Mark one or more notifications as read
  // Prepare read input: contains at least one notification id
  // Use typia.random() to generate uuid list with at least one element
  // Because we cannot verify ownership or existence, test only marking with valid UUID array
  const notificationIds: string[] = [
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // Call patch endpoint to mark as read
  const updated =
    await api.functional.shoppingMall.customer.notifications.read.markRead(
      customerConnection,
      { body: { notificationIds } },
    );
  typia.assert(updated);
  // Validate response is read and readAt set
  TestValidator.equals(
    "returned notification id",
    updated.id,
    notificationIds[0],
  );
  TestValidator.predicate("isRead flag is true", updated.isRead === true);
  TestValidator.predicate("readAt timestamp is set", updated.readAt !== null);
}
