import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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

export async function test_api_customer_order_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer via POST /ecommerceMall/auth/customer/join
  //    - Use authorize_customer_join utility function
  //    - Create new connection with authorization token
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Call PATCH /ecommerceMall/customer/orders with empty request body to retrieve all orders
  const ordersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(ordersResponse);
  // 3. Validate response contains pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    ordersResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    ordersResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    ordersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    ordersResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(ordersResponse.data),
    true,
  );
  // 4. Validate each order in data array contains required fields
  for (const order of ordersResponse.data) {
    TestValidator.predicate(
      "order has order_number",
      order.order_number.length > 0,
    );
    TestValidator.predicate(
      "order has status",
      typeof order.status === "string",
    );
    TestValidator.predicate(
      "order has total_amount",
      typeof order.total_amount === "number",
    );
    TestValidator.predicate(
      "order has created_at",
      /'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'/.test(order.created_at),
    );
    TestValidator.predicate(
      "order has customer summary",
      order.customer !== null && order.customer !== undefined,
    );
    TestValidator.equals(
      "customer id matches",
      order.customer.id,
      authorized.id,
    );
  }
  // 5. Verify orders are sorted by created_at DESC (newest first)
  if (ordersResponse.data.length > 1) {
    for (let i = 0; i < ordersResponse.data.length - 1; i++) {
      const current = new Date(ordersResponse.data[i].created_at).getTime();
      const next = new Date(ordersResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `order ${i} is newer than order ${i + 1}`,
        current >= next,
      );
    }
  }
  // 6. Test pagination with page and limit parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 5,
  );
  // 7. Test status filter (optional field)
  const statusFilteredResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(statusFilteredResponse);
  // If orders exist with status filter, all should have matching status
  for (const order of statusFilteredResponse.data) {
    TestValidator.equals("order status matches filter", order.status, "paid");
  }
  // 8. Validate customer can only see their own orders (data isolation)
  //    - The customer.id in each order should match the authorized customer
  for (const order of ordersResponse.data) {
    TestValidator.equals(
      "order belongs to authenticated customer",
      order.customer.id,
      authorized.id,
    );
  }
}
