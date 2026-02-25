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

export async function test_api_customer_notifications_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving user notifications for a customer who currently has no notifications.
  // Verify that the response returns an empty notification list with pagination metadata properly indicating zero records and zero pages, ensuring graceful handling of empty data sets.
  // Ensure customer authorization via join operation precedes notification retrieval.
  // 1. Authorize customer by join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  typia.assert(authorized);
  // Update customerConnection headers with authorization token
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Prepare request body to fetch notifications for the customer with no notifications
  const requestBody: IShoppingMallUserNotification.IRequest = {};
  // 3. Call notifications index endpoint
  const notifications =
    await api.functional.shoppingMall.customer.notifications.index(
      customerConnection,
      {
        body: requestBody,
      },
    );
  // 4. Assert response structure
  typia.assert(notifications);
  // 5. Validate that the notification list is empty
  TestValidator.equals(
    "notification list is empty",
    notifications.data.length,
    0,
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    notifications.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", notifications.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    notifications.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", notifications.pagination.pages, 0);
}
