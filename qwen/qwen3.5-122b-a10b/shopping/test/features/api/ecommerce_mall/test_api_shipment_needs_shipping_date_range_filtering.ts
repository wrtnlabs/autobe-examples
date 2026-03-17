import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_needs_shipping_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Test date range filtering with various scenarios
  const now = new Date();
  // Test 2a: Filter with date range covering all items (should return all paid items)
  const allItemsRange =
    await api.functional.ecommerceMall.seller.shipments.needs_shipping.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          created_at_from: new Date(
            now.getTime() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 year ago
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsRange);
  // Test 2b: Filter with narrow date range (may return fewer items)
  const narrowRange =
    await api.functional.ecommerceMall.seller.shipments.needs_shipping.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          created_at_from: new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days ago
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(narrowRange);
  // Test 2c: Filter with future date range (should return empty)
  const futureRange =
    await api.functional.ecommerceMall.seller.shipments.needs_shipping.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          created_at_from: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days in future
          created_at_to: new Date(
            now.getTime() + 60 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 60 days in future
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(futureRange);
  // Test 2d: Filter without date range (should return all paid items)
  const noDateFilter =
    await api.functional.ecommerceMall.seller.shipments.needs_shipping.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(noDateFilter);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "all items range has pagination",
    allItemsRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "narrow range has pagination",
    narrowRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "future range has pagination",
    futureRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "no date filter has pagination",
    noDateFilter.pagination !== undefined,
  );
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    allItemsRange.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allItemsRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allItemsRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allItemsRange.pagination.pages >= 0,
  );
  // 5. Validate data structure
  TestValidator.predicate(
    "all items range data is array",
    Array.isArray(allItemsRange.data),
  );
  TestValidator.predicate(
    "narrow range data is array",
    Array.isArray(narrowRange.data),
  );
  TestValidator.predicate(
    "future range data is array",
    Array.isArray(futureRange.data),
  );
  TestValidator.predicate(
    "no date filter data is array",
    Array.isArray(noDateFilter.data),
  );
  // 6. Validate future range returns empty (no items from future)
  TestValidator.equals(
    "future range returns no items",
    futureRange.data.length,
    0,
  );
  // 7. Validate narrow range is subset of all items range (if both have items)
  if (allItemsRange.data.length > 0 && narrowRange.data.length > 0) {
    TestValidator.predicate(
      "narrow range count <= all items range count",
      narrowRange.data.length <= allItemsRange.data.length,
    );
  }
  // 8. Validate all returned items have correct status
  for (const item of allItemsRange.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
    TestValidator.predicate(
      "item has valid ID",
      item.id !== undefined && item.id !== null,
    );
    TestValidator.predicate(
      "item has valid createdAt",
      item.createdAt !== undefined && item.createdAt !== null,
    );
    TestValidator.predicate("item has valid quantity", item.quantity > 0);
    TestValidator.predicate("item has valid unitPrice", item.unitPrice >= 0);
  }
  // 9. Validate date filtering logic - items in narrow range should be within 7 days
  for (const item of narrowRange.data) {
    const itemDate = new Date(item.createdAt);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    TestValidator.predicate(
      `item ${item.id} createdAt is within 7 days`,
      itemDate >= sevenDaysAgo && itemDate <= now,
    );
  }
  // 10. Validate sorting (default is created_at descending - newest first)
  if (allItemsRange.data.length > 1) {
    for (let i = 0; i < allItemsRange.data.length - 1; i++) {
      const currentItem = new Date(allItemsRange.data[i].createdAt);
      const nextItem = new Date(allItemsRange.data[i + 1].createdAt);
      TestValidator.predicate(
        `items sorted by createdAt descending (index ${i} >= ${i + 1})`,
        currentItem >= nextItem,
      );
    }
  }
}
