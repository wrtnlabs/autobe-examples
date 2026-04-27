import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_items_filter_and_search(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Seller Registration (Prerequisite)
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IECommerceMallSeller.IJoin>,
  });
  //----
  // 2. Status Filtering (OR logic)
  //----
  // 2.1 Single status filter: paid
  const paidItems = await api.functional.eCommerceMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        status: ["paid"],
        page: 1,
        limit: 100,
      } satisfies IECommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(paidItems);
  // 2.2 Multiple status filter: shipped + delivered (OR logic)
  const shippedDeliveredItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["shipped", "delivered"],
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedDeliveredItems);
  // 2.3 Terminal status filter: cancelled + refunded
  const terminalItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["cancelled", "refunded"],
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(terminalItems);
  // 2.4 All statuses (no filtering effect)
  const allStatusItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["paid", "shipped", "delivered", "cancelled", "refunded"],
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allStatusItems);
  //----
  // 3. Order Code Search (substring match)
  //----
  // 3.1 Non-existent order code → empty result
  const nonExistentOrderItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          orderCode: "NONEXISTENT123456",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(nonExistentOrderItems);
  TestValidator.equals(
    "non-existent order code returns empty",
    0,
    nonExistentOrderItems.pagination.records,
  );
  TestValidator.equals(
    "non-existent order code data length",
    0,
    nonExistentOrderItems.data.length,
  );
  //----
  // 4. Variant SKU Search (substring match)
  //----
  // 4.1 Non-existent variant SKU → empty result
  const nonExistentSkuItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          variantSku: "NONEXISTENTSKU999",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(nonExistentSkuItems);
  TestValidator.equals(
    "non-existent variant SKU returns empty",
    0,
    nonExistentSkuItems.pagination.records,
  );
  TestValidator.equals(
    "non-existent variant SKU data length",
    0,
    nonExistentSkuItems.data.length,
  );
  //----
  // 5. Date Range Filtering
  //----
  // 5.1 Recent date range
  const recentDate = new Date();
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const recentItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: recentDate.toISOString(),
          createdAtTo: futureDate.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(recentItems);
  // 5.2 Past date range (items from the past year)
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const today = new Date();
  const pastYearItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: yearAgo.toISOString(),
          createdAtTo: today.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(pastYearItems);
  // 5.3 Old date range that should return empty
  const oldFrom = new Date("2000-01-01T00:00:00.000Z");
  const oldTo = new Date("2000-06-01T00:00:00.000Z");
  const oldRangeItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oldFrom.toISOString(),
          createdAtTo: oldTo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(oldRangeItems);
  TestValidator.equals(
    "old date range returns empty",
    0,
    oldRangeItems.pagination.records,
  );
  //----
  // 6. Combined Filters
  //----
  // 6.1 Order code + status combined
  const combinedOrderAndStatus =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          orderCode: "NONEXISTENT123456",
          status: ["paid"],
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedOrderAndStatus);
  TestValidator.equals(
    "combined non-existent order + paid status returns empty",
    0,
    combinedOrderAndStatus.pagination.records,
  );
  // 6.2 Variant SKU + status combined
  const combinedSkuAndStatus =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          variantSku: "NONEXISTENTSKU999",
          status: ["shipped", "delivered"],
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedSkuAndStatus);
  TestValidator.equals(
    "combined non-existent SKU + shipped/delivered returns empty",
    0,
    combinedSkuAndStatus.pagination.records,
  );
  //----
  // 7. Sort Order Verification (newest first by created_at descending)
  //----
  // Get all items and verify they are sorted by created_at descending
  const sortedItems =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedItems);
  const sortedData = sortedItems.data;
  if (sortedData.length > 1) {
    for (let i = 1; i < sortedData.length; i++) {
      TestValidator.predicate(
        `item[${i - 1}].created_at >= item[${i}].created_at (newest first)`,
        () =>
          new Date(sortedData[i - 1].created_at).getTime() >=
          new Date(sortedData[i].created_at).getTime(),
      );
    }
  }
}
