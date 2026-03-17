import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Retrieve customer orders list (will have mock orders in simulate mode)
  const response = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate order summaries structure
  if (response.data.length > 0) {
    const order = response.data[0];
    typia.assert(order);
    TestValidator.predicate("order id is valid UUID", order.id.length > 0);
    TestValidator.predicate(
      "order_number is not empty",
      order.order_number.length > 0,
    );
    TestValidator.predicate(
      "order total_price is positive",
      order.total_price > 0,
    );
    TestValidator.predicate(
      "order status is not empty",
      order.status.length > 0,
    );
    TestValidator.predicate(
      "order shipping_address exists",
      order.shipping_address !== undefined,
    );
    TestValidator.predicate(
      "order created_at exists",
      order.created_at !== undefined,
    );
    // 5. Validate shipping_address structure
    const shippingAddress = order.shipping_address;
    typia.assert(shippingAddress);
    TestValidator.predicate(
      "shipping recipient_name is not empty",
      shippingAddress.recipient_name.length > 0,
    );
    TestValidator.predicate(
      "shipping recipient_phone is not empty",
      shippingAddress.recipient_phone.length > 0,
    );
    TestValidator.predicate(
      "shipping street is not empty",
      shippingAddress.street.length > 0,
    );
    TestValidator.predicate(
      "shipping city is not empty",
      shippingAddress.city.length > 0,
    );
    TestValidator.predicate(
      "shipping state is not empty",
      shippingAddress.state.length > 0,
    );
  }
}
