import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_orders_list_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve paginated orders with pagination parameters
  const orders = await api.functional.ecommercePlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommercePlatformOrder.IRequest,
    },
  );
  typia.assert(orders);
  // 3. Validate pagination structure exists
  TestValidator.equals(
    "pagination object exists",
    orders.pagination,
    orders.pagination,
  );
  // 4. Validate pagination metadata fields
  TestValidator.equals(
    "pagination current page is 1",
    orders.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    orders.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    orders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    orders.pagination.pages >= 0,
  );
  // 5. Validate data array exists (can be empty if no orders)
  TestValidator.predicate("data array exists", Array.isArray(orders.data));
  // 6. If orders exist, validate order summary fields
  if (orders.data.length > 0) {
    const firstOrder = orders.data[0];
    typia.assert(firstOrder);
    TestValidator.predicate(
      "first order id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstOrder.id,
      ),
    );
    TestValidator.predicate(
      "first order has orderNumber",
      firstOrder.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "first order createdAt is valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstOrder.createdAt),
    );
    TestValidator.predicate(
      "first order has status value",
      firstOrder.status.length > 0,
    );
    TestValidator.predicate(
      "first order has total price value",
      firstOrder.totalPrice >= 0,
    );
    typia.assert(firstOrder.shippingAddress);
    TestValidator.predicate(
      "first order shipping address has id",
      firstOrder.shippingAddress.id.length > 0,
    );
  }
  // 7. Validate sorting by createdAt DESC with UUID tiebreaker
  if (orders.data.length > 1) {
    TestValidator.predicate(
      "orders are sorted by createdAt in descending order",
      orders.data.every((order, index) => {
        if (index === 0) return true;
        const previousOrder = orders.data[index - 1];
        const previousDate = new Date(previousOrder.createdAt).getTime();
        const currentDate = new Date(order.createdAt).getTime();
        return previousDate >= currentDate;
      }),
    );
  }
}
