import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

export async function test_api_customer_order_history_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // ---- Data Setup ----
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create 5 orders to have sufficient data for pagination and filter testing
  const createdOrders: IECommerceMallOrder[] = [];
  for (let i = 0; i < 5; i++) {
    const order = await generate_random_e_commerce_mall_customer_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    createdOrders.push(order);
  }
  // ---- Pagination Tests ----
  // 1. Page 1, limit 2
  const page1 = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    { body: { page: 1, limit: 2 } satisfies IECommerceMallOrder.IRequest },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 count", page1.data.length, 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate("records >= 5", page1.pagination.records >= 5);
  TestValidator.predicate("pages >= 3", page1.pagination.pages >= 3);
  // 2. Page 2, limit 2 — no overlap with page 1
  const page2 = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    { body: { page: 2, limit: 2 } satisfies IECommerceMallOrder.IRequest },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 count", page2.data.length, 2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.predicate(
    "no overlap with page 1",
    page2.data.every((item) => page1.data.every((p1) => p1.id !== item.id)),
  );
  TestValidator.predicate(
    "descending order (newest first)",
    new Date(page2.data[0].created_at).getTime() <
      new Date(page1.data[page1.data.length - 1].created_at).getTime(),
  );
  // 3. Max limit = 100
  const maxLimit = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    { body: { page: 1, limit: 100 } satisfies IECommerceMallOrder.IRequest },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit respected", maxLimit.pagination.limit, 100);
  TestValidator.predicate(
    "max limit retrieves all orders",
    maxLimit.data.length >= createdOrders.length,
  );
  // ---- Date Range Filtering Tests ----
  // Sort the full orders by created_at ascending for date analysis
  const sortedOrders = [...createdOrders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const middleOrder = sortedOrders[2];
  const middleDate = middleOrder.createdAt;
  // Filter: start_date = middle date — only orders at or after that date
  const afterMiddle = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    { body: { start_date: middleDate } satisfies IECommerceMallOrder.IRequest },
  );
  typia.assert(afterMiddle);
  TestValidator.predicate(
    "start_date filter: all returned orders are at or after start_date",
    afterMiddle.data.every(
      (o) => new Date(o.created_at).getTime() >= new Date(middleDate).getTime(),
    ),
  );
  // Filter: end_date = middle date — only orders at or before that date
  const beforeMiddle = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    { body: { end_date: middleDate } satisfies IECommerceMallOrder.IRequest },
  );
  typia.assert(beforeMiddle);
  TestValidator.predicate(
    "end_date filter: all returned orders are at or before end_date",
    beforeMiddle.data.every(
      (o) => new Date(o.created_at).getTime() <= new Date(middleDate).getTime(),
    ),
  );
  // ---- Search Filtering Test ----
  // Take a partial substring from the first (newest) order code in the listing
  const newestOrderCode = page1.data[0].code;
  const searchKeyword = newestOrderCode.substring(
    0,
    Math.min(8, newestOrderCode.length),
  );
  const searchResult = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    { body: { search: searchKeyword } satisfies IECommerceMallOrder.IRequest },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filter returned results",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "search filter: all returned orders contain the search keyword in their code",
    searchResult.data.every((o) => o.code.includes(searchKeyword)),
  );
  // ---- Combined Filters Test (status + pagination) ----
  const combined = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 10,
      } satisfies IECommerceMallOrder.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.predicate(
    "combined filter: all returned orders have status 'paid'",
    combined.data.every((o) => o.status === "paid"),
  );
  TestValidator.equals(
    "combined filter: page 1",
    combined.pagination.current,
    1,
  );
}
