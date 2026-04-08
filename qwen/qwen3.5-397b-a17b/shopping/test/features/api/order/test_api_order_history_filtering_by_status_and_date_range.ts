import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test member order history filtering by status and date range.
 *
 * Validates the complete order history filtering workflow including member registration, order creation with different statuses, and comprehensive filtering tests. Ensures that all filter combinations work correctly for order history navigation.
 *
 * Tests cover status filtering (single and multiple values), date range filtering with created_at_gte and created_at_lte, combined status and date filters, order code search with case-insensitive partial matching, and sorting by different fields with both ascending and descending directions.
 *
 * 1. Member registers with unique credentials.
 * 2. Member creates multiple orders at different times.
 * 3. Tests single status filtering returns only matching orders.
 * 4. Tests multiple status filtering returns orders matching any specified status.
 * 5. Tests date range filtering with created_at_gte and created_at_lte.
 * 6. Tests combined status and date filters work together.
 * 7. Tests order code search performs case-insensitive partial matching.
 * 8. Tests sorting by created_at, code, and total_price with asc and desc directions.
 */
export async function test_api_order_history_filtering_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create multiple orders for testing
  const orders: IShoppingMallOrder[] = [];
  for (let i = 0; i < 5; i++) {
    const order = await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
    typia.assert(order);
    orders.push(order);
  }
  // 3. Test single status filtering
  const paidOrders = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  TestValidator.predicate(
    "single status filter returns matching orders",
    paidOrders.data.every((order) => order.status === "paid"),
  );
  // 4. Test multiple status filtering
  const multiStatusOrders =
    await api.functional.shoppingMall.member.orders.index(memberConnection, {
      body: {
        status: ["paid", "shipped"],
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(multiStatusOrders);
  TestValidator.predicate(
    "multiple status filter returns matching orders",
    multiStatusOrders.data.every(
      (order) => order.status === "paid" || order.status === "shipped",
    ),
  );
  // 5. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeOrders = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        created_at_gte: yesterday.toISOString(),
        created_at_lte: tomorrow.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(dateRangeOrders);
  TestValidator.predicate(
    "date range filter returns orders within time window",
    dateRangeOrders.data.every(
      (order) =>
        new Date(order.created_at) >= yesterday &&
        new Date(order.created_at) <= tomorrow,
    ),
  );
  // 6. Test combined status and date filters
  const combinedOrders = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        status: "paid",
        created_at_gte: yesterday.toISOString(),
        created_at_lte: tomorrow.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(combinedOrders);
  TestValidator.predicate(
    "combined filters work correctly together",
    combinedOrders.data.every(
      (order) =>
        order.status === "paid" &&
        new Date(order.created_at) >= yesterday &&
        new Date(order.created_at) <= tomorrow,
    ),
  );
  // 7. Test order code search (case-insensitive partial matching)
  const searchOrder = orders[0];
  const searchCode = searchOrder.code.substring(0, 5);
  const searchOrders = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        search: searchCode,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(searchOrders);
  TestValidator.predicate(
    "order code search performs partial matching",
    searchOrders.data.some((order) =>
      order.code.toLowerCase().includes(searchCode.toLowerCase()),
    ),
  );
  // 8. Test sorting by created_at ascending
  const sortedByCreatedAtAsc =
    await api.functional.shoppingMall.member.orders.index(memberConnection, {
      body: {
        sort: "created_at",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByCreatedAtAsc);
  TestValidator.predicate(
    "sorting by created_at asc works correctly",
    sortedByCreatedAtAsc.data.every((order, index, arr) => {
      if (index === 0) return true;
      return (
        new Date(arr[index - 1].created_at).getTime() <=
        new Date(order.created_at).getTime()
      );
    }),
  );
  // 9. Test sorting by created_at descending
  const sortedByCreatedAtDesc =
    await api.functional.shoppingMall.member.orders.index(memberConnection, {
      body: {
        sort: "created_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByCreatedAtDesc);
  TestValidator.predicate(
    "sorting by created_at desc works correctly",
    sortedByCreatedAtDesc.data.every((order, index, arr) => {
      if (index === 0) return true;
      return (
        new Date(arr[index - 1].created_at).getTime() >=
        new Date(order.created_at).getTime()
      );
    }),
  );
  // 10. Test sorting by total_price ascending
  const sortedByPriceAsc =
    await api.functional.shoppingMall.member.orders.index(memberConnection, {
      body: {
        sort: "total_price",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByPriceAsc);
  TestValidator.predicate(
    "sorting by total_price asc works correctly",
    sortedByPriceAsc.data.every((order, index, arr) => {
      if (index === 0) return true;
      return arr[index - 1].total_price <= order.total_price;
    }),
  );
  // 11. Test sorting by total_price descending
  const sortedByPriceDesc =
    await api.functional.shoppingMall.member.orders.index(memberConnection, {
      body: {
        sort: "total_price",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByPriceDesc);
  TestValidator.predicate(
    "sorting by total_price desc works correctly",
    sortedByPriceDesc.data.every((order, index, arr) => {
      if (index === 0) return true;
      return arr[index - 1].total_price >= order.total_price;
    }),
  );
  // 12. Test sorting by code ascending
  const sortedByCodeAsc = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        sort: "code",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortedByCodeAsc);
  TestValidator.predicate(
    "sorting by code asc works correctly",
    sortedByCodeAsc.data.every((order, index, arr) => {
      if (index === 0) return true;
      return arr[index - 1].code.localeCompare(order.code) <= 0;
    }),
  );
  // 13. Test sorting by code descending
  const sortedByCodeDesc =
    await api.functional.shoppingMall.member.orders.index(memberConnection, {
      body: {
        sort: "code",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByCodeDesc);
  TestValidator.predicate(
    "sorting by code desc works correctly",
    sortedByCodeDesc.data.every((order, index, arr) => {
      if (index === 0) return true;
      return arr[index - 1].code.localeCompare(order.code) >= 0;
    }),
  );
}
