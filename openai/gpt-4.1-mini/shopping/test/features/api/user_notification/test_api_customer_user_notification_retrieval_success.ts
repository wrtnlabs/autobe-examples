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

export async function test_api_customer_user_notification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval of a user notification detail owned by an authenticated customer, asserting response shape.
  // 1. Preconditions: Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1234",
    },
  });
  customerConnection.headers = { Authorization: customer.token.access };
  // 2. Action: Retrieve a user notification by a random UUID (simulate existing notification)
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const retrieved =
    await api.functional.shoppingMall.customer.userNotifications.at(
      customerConnection,
      {
        notificationId,
      },
    );
  // 3. Assertions: Validate response shape only
  typia.assert(retrieved);
  TestValidator.equals(
    "owner id matches customer id",
    retrieved.owner_id,
    customer.id,
  );
  TestValidator.equals(
    "owner type is customer",
    retrieved.owner_type,
    "customer",
  );
}
