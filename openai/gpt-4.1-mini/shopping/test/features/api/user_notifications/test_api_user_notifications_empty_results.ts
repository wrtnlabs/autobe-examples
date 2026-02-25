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

export async function test_api_user_notifications_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer sign up and obtain authorization token
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare a filter that should return no notifications
  // For example, a future deliveredFrom date guaranteed to have no notifications
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in the future
  const filter: IShoppingMallUserNotification.IRequest = {
    ownerType: "nonexistent_owner_type",
    deliveredFrom: futureDate,
    page: 1,
    limit: 10,
  };
  // 3. Query user notifications with the filter
  const response =
    await api.functional.shoppingMall.customer.userNotifications.index(
      customerConnection,
      { body: filter },
    );
  // 4. Assert that the response matches the expected empty paginated structure
  typia.assert(response);
  // Pagination metadata expectations
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", response.pagination.pages, 0);
  // Data array should be empty
  TestValidator.equals("data array length", response.data.length, 0);
}
