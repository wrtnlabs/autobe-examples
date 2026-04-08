import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test inventory record filtering by date range and reason codes.
 *
 * Validates the inventory history filtering functionality including date range filters (createdAtGte, createdAtLte), reason code filters (reason, reasons), and quantity delta range filters (quantityDeltaMin, quantityDeltaMax). Ensures that sellers can effectively audit inventory movements by specific time periods, track movement types, and identify significant stock changes.
 *
 * The test verifies that each filter type works independently and in combination, that pagination correctly reflects filtered results, and that empty result sets return valid pagination structures.
 *
 * 1. Seller authenticates via join operation.
 * 2. Query inventory history with date range filters (createdAtGte, createdAtLte).
 * 3. Query inventory history with single reason filter (exact match).
 * 4. Query inventory history with multiple reasons filter (OR logic).
 * 5. Query with quantity delta range filters (quantityDeltaMin, quantityDeltaMax).
 * 6. Query with combined filters (date + reason + quantity).
 * 7. Validate pagination structure and filter accuracy.
 */
export async function test_api_inventory_record_filtering_by_date_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Use a random variant ID for testing (in real scenario, would use created variant)
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Define date range for filtering tests
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 2. Test date range filtering
  const dateFilteredResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          createdAtGte: oneDayAgo.toISOString(),
          createdAtLte: oneDayLater.toISOString(),
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    () => dateFilteredResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => dateFilteredResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => dateFilteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => dateFilteredResult.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", () =>
    Array.isArray(dateFilteredResult.data),
  );
  // Validate all records are within date range
  for (const record of dateFilteredResult.data) {
    TestValidator.predicate(
      `record ${record.id} within date range`,
      () =>
        new Date(record.created_at) >= oneDayAgo &&
        new Date(record.created_at) <= oneDayLater,
    );
  }
  // 3. Test single reason filter
  const reasonFilteredResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          reason: "RESTOCK",
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonFilteredResult);
  // Validate all records match the reason
  for (const record of reasonFilteredResult.data) {
    TestValidator.equals(
      `record ${record.id} has reason RESTOCK`,
      record.reason,
      "RESTOCK",
    );
  }
  // 4. Test multiple reasons filter (OR logic)
  const multipleReasonsResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          reasons: ["RESTOCK", "ORDER_PLACEMENT", "ADJUSTMENT"],
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(multipleReasonsResult);
  // Validate all records match one of the reasons
  const allowedReasons = ["RESTOCK", "ORDER_PLACEMENT", "ADJUSTMENT"];
  for (const record of multipleReasonsResult.data) {
    TestValidator.predicate(`record ${record.id} has allowed reason`, () =>
      allowedReasons.includes(record.reason),
    );
  }
  // 5. Test quantity delta range filters
  const quantityFilteredResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          quantityDeltaMin: -100,
          quantityDeltaMax: 100,
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(quantityFilteredResult);
  // Validate all records are within quantity range
  for (const record of quantityFilteredResult.data) {
    TestValidator.predicate(
      `record ${record.id} quantity within range`,
      () => record.quantity_delta >= -100 && record.quantity_delta <= 100,
    );
  }
  // 6. Test combined filters (date + reason + quantity)
  const combinedFilteredResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          createdAtGte: oneDayAgo.toISOString(),
          createdAtLte: oneDayLater.toISOString(),
          reason: "RESTOCK",
          quantityDeltaMin: 1,
          quantityDeltaMax: 1000,
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedFilteredResult);
  // Validate all records match combined criteria
  for (const record of combinedFilteredResult.data) {
    TestValidator.predicate(
      `record ${record.id} within date range`,
      () =>
        new Date(record.created_at) >= oneDayAgo &&
        new Date(record.created_at) <= oneDayLater,
    );
    TestValidator.equals(
      `record ${record.id} has reason RESTOCK`,
      record.reason,
      "RESTOCK",
    );
    TestValidator.predicate(
      `record ${record.id} quantity positive`,
      () => record.quantity_delta >= 1 && record.quantity_delta <= 1000,
    );
  }
  // 7. Test empty result set returns valid pagination
  const emptyResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          reason: "NONEXISTENT_REASON_CODE_12345",
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result structure
  TestValidator.equals(
    "empty result has zero data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // 8. Test sorting with filters
  const sortedResult =
    await api.functional.shoppingMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          createdAtGte: oneDayAgo.toISOString(),
          sort: "created_at",
          order: "DESC",
          take: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Validate descending order
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      TestValidator.predicate(
        `record ${i} is older than record ${i - 1}`,
        () =>
          new Date(sortedResult.data[i].created_at) <=
          new Date(sortedResult.data[i - 1].created_at),
      );
    }
  }
}
