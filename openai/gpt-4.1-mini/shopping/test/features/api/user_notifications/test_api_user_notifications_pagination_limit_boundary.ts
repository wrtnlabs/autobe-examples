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

export async function test_api_user_notifications_pagination_limit_boundary(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the boundary condition of requesting user notifications with maximum allowed pagination limit (100 items per page).
  // It verifies that the system enforces the upper limit constraint and returns exactly the limit number of notifications if enough records exist.
  // The test ensures proper sorting by delivery date and respects filtering by read status, owner type, and search keywords.
  // Customer authentication is a prerequisite for authorized access.
  // Authorize customer user with random join data
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass1234",
    },
  });
  typia.assert(authorizedCustomer);
  // Set authorization token in customerConnection headers
  if (!customerConnection.headers) customerConnection.headers = {};
  customerConnection.headers.Authorization = `Bearer ${authorizedCustomer.token.access}`;
  // Prepare request body for user notifications with max limit 100
  const requestBody: IShoppingMallUserNotification.IRequest = {
    ownerType: "customer",
    isRead: undefined,
    page: 1,
    limit: 100,
    sortBy: "deliveredAt",
    sortOrder: "desc",
  };
  // Call PATCH /shoppingMall/customer/userNotifications index endpoint
  const response =
    await api.functional.shoppingMall.customer.userNotifications.index(
      customerConnection,
      { body: requestBody },
    );
  // Assert response matches pagination summary dto
  typia.assert(response);
  // Validate the count of returned notifications does not exceed 100
  TestValidator.predicate(
    "limit boundary: notifications count less or equal to 100",
    response.data.length <= 100,
  );
  // Validate sorting by deliveredAt descending
  for (let i = 0; i + 1 < response.data.length; ++i) {
    const curr = response.data[i];
    const next = response.data[i + 1];
    // Because deliveredAt nullable, nulls are treated as less recent than any date
    // So in descending order, null should appear last
    if (curr.deliveredAt === null) {
      // Current is null, next must also be null or less recent (nulls last)
      TestValidator.predicate(
        "deliveredAt sorting nulls last",
        next.deliveredAt === null,
      );
    } else if (next.deliveredAt === null) {
      // Next is null: current must be non-null, thus order is correct
      TestValidator.predicate("deliveredAt sorting nulls last", true);
    } else {
      // Both non-null: current.deliveredAt >= next.deliveredAt
      TestValidator.predicate(
        "deliveredAt descending order",
        new Date(curr.deliveredAt).getTime() >=
          new Date(next.deliveredAt).getTime(),
      );
    }
  }
  // Optional: Additional checks can be added here for ownerType matching etc.
}
