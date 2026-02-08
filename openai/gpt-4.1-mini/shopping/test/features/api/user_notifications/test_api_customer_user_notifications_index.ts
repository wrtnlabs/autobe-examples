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

export async function test_api_customer_user_notifications_index(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve all notifications for a newly registered customer without any filters.
  {
    // Create customer connection
    const customerConnection: api.IConnection = { host: connection.host };
    // Register and authorize customer
    const auth = await authorize_customer_join(customerConnection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
    // Update headers with access token
    customerConnection.headers = { Authorization: auth.token.access };
    // PATCH /shoppingMall/customer/userNotifications with empty filter
    const notifications =
      await api.functional.shoppingMall.customer.userNotifications.index(
        customerConnection,
        { body: {} satisfies IShoppingMallUserNotification.IRequest },
      );
    typia.assert(notifications);
    // Validate pagination metadata exists and is correct
    TestValidator.predicate(
      "pagination exists",
      notifications.pagination !== null &&
        typeof notifications.pagination === "object",
    );
    TestValidator.predicate(
      "pagination current page >= 0",
      notifications.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      notifications.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      notifications.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      notifications.pagination.pages >= 0,
    );
    // Check each notification is valid
    notifications.data.forEach((notification) => {
      typia.assert(notification);
    });
  }
  // Scenario 2: Cannot filter due to empty request DTO, perform same as scenario 1.
  {
    const customerConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_customer_join(customerConnection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
    customerConnection.headers = { Authorization: auth.token.access };
    // Call with empty body
    const notifications =
      await api.functional.shoppingMall.customer.userNotifications.index(
        customerConnection,
        { body: {} satisfies IShoppingMallUserNotification.IRequest },
      );
    typia.assert(notifications);
    TestValidator.predicate(
      "pagination current page >= 0",
      notifications.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      notifications.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      notifications.pagination.records >= 0,
    );
  }
  // Scenario 3: Cannot filter or paginate due to empty request DTO, perform same as scenario 1.
  {
    const customerConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_customer_join(customerConnection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
    customerConnection.headers = { Authorization: auth.token.access };
    // Call with empty body
    const notifications =
      await api.functional.shoppingMall.customer.userNotifications.index(
        customerConnection,
        { body: {} satisfies IShoppingMallUserNotification.IRequest },
      );
    typia.assert(notifications);
    TestValidator.predicate(
      "pagination current page >= 0",
      notifications.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      notifications.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      notifications.pagination.records >= 0,
    );
  }
}
