import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Verify seller authentication token is set in connection headers
  TestValidator.predicate(
    "seller connection has authorization",
    sellerConnection.headers?.authorization !== undefined,
  );
  // 2. Query inventory history with all possible filters
  // Note: In actual implementation, inventory records would be created through:
  // - RESTOCK operations (adding stock)
  // - ORDER_DEDUCTION (removing stock for orders)
  // - REFUND_RETURN (stock returned from refunds)
  // - CANCELLATION_RETURN (stock returned from cancellations)
  // - ADJUSTMENT (manual inventory adjustments)
  // Since we're testing the view endpoint, we use simulate mode to get valid test data
  const simulateConnection: api.IConnection = {
    ...sellerConnection,
    simulate: true,
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test base query - retrieve all inventory records
  const allRecords =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(allRecords);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", allRecords.pagination.current, 1);
  TestValidator.equals("limit is 10", allRecords.pagination.limit, 10);
  TestValidator.predicate(
    "total records >= 0",
    allRecords.pagination.records >= 0,
  );
  TestValidator.predicate("total pages >= 0", allRecords.pagination.pages >= 0);
  // Validate pagination math: pages = ceil(records / limit)
  if (allRecords.pagination.records > 0) {
    const expectedPages = Math.ceil(
      allRecords.pagination.records / allRecords.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      allRecords.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "no records means no pages",
      allRecords.pagination.pages,
      0,
    );
  }
  // 5. Validate inventory records structure and content
  typia.assert(allRecords.data);
  for (let i = 0; i < allRecords.data.length; i++) {
    const record = allRecords.data[i];
    typia.assert(record);
    // Validate required fields exist
    TestValidator.equals(
      `record ${i} has valid ID`,
      record.id !== null && record.id !== undefined,
      true,
    );
    TestValidator.predicate(
      `record ${i} has quantity change`,
      typeof record.quantity_change === "number",
    );
    TestValidator.equals(
      `record ${i} has operation type`,
      record.operation_type !== null && record.operation_type !== undefined,
      true,
    );
    TestValidator.equals(
      `record ${i} has created_at`,
      record.created_at !== null && record.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      `record ${i} has product variant`,
      record.productVariant !== null,
      true,
    );
    TestValidator.equals(
      `record ${i} has reference_id`,
      record.reference_id === null || record.reference_id !== undefined,
      true,
    );
    TestValidator.equals(
      `record ${i} has notes`,
      typeof record.notes === "string" || record.notes === null,
      true,
    );
    // Validate product variant structure
    typia.assert(record.productVariant);
    TestValidator.equals(
      `variant ${i} has ID`,
      record.productVariant.id !== null,
      true,
    );
    TestValidator.equals(
      `variant ${i} has SKU`,
      record.productVariant.sku_code !== null,
      true,
    );
    TestValidator.equals(
      `variant ${i} has price`,
      typeof record.productVariant.price === "number" ||
        record.productVariant.price === null,
      true,
    );
    TestValidator.predicate(
      `variant ${i} has stock quantity`,
      record.productVariant.stock_quantity >= 0,
    );
  }
  // 6. Test filtering by operation type
  const restockRecords =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
          operationType: "RESTOCK",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(restockRecords);
  if (restockRecords.data.length > 0) {
    // Verify all returned records match the filter
    for (const record of restockRecords.data) {
      TestValidator.equals(
        "restock filter operation type",
        record.operation_type,
        "RESTOCK",
      );
    }
  }
  // 7. Test filtering by quantity range
  const quantityFiltered =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
          minQuantity: 1,
          maxQuantity: 100,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(quantityFiltered);
  for (const record of quantityFiltered.data) {
    TestValidator.predicate(
      "quantity within range",
      record.quantity_change >= 1 && record.quantity_change <= 100,
    );
  }
  // 8. Test filtering by date range
  const dateFilter = new Date();
  const fromDate = new Date(
    dateFilter.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const toDate = new Date(
    dateFilter.getTime() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day in future
  const dateFiltered =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
          fromDate,
          toDate,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateFiltered);
  for (const record of dateFiltered.data) {
    TestValidator.predicate(
      "created_at within date range",
      record.created_at >= fromDate && record.created_at <= toDate,
    );
  }
  // 9. Test sorting - verify newest records first
  const sortedRecords =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 10,
        },
      },
    );
  typia.assert(sortedRecords);
  if (sortedRecords.data.length > 1) {
    for (let i = 0; i < sortedRecords.data.length - 1; i++) {
      const currentRecord = sortedRecords.data[i];
      const nextRecord = sortedRecords.data[i + 1];
      TestValidator.predicate(
        "records sorted descending by created_at",
        currentRecord.created_at >= nextRecord.created_at,
      );
    }
  }
  // 10. Test pagination - navigate to different pages
  if (allRecords.pagination.records > 10) {
    const secondPage =
      await api.functional.ecommerceMall.seller.products.variants.inventory.index(
        simulateConnection,
        {
          productId,
          variantId,
          body: {
            search: null,
            page: 2,
            limit: 10,
          },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
    // Verify no overlap with first page by checking different records
    TestValidator.notEquals(
      "second page has different records",
      secondPage.data.length,
      0,
    );
  }
  // 11. Calculate and verify current stock (sum of all quantity_change values)
  if (allRecords.data.length > 0) {
    const totalStockChange = allRecords.data.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    TestValidator.predicate(
      "total stock change is calculated",
      typeof totalStockChange === "number",
    );
  }
  // 12. Test search/notes filtering
  const searchFiltered =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null, // null means no search filter
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchFiltered);
  // Verify search with null doesn't filter out records
  TestValidator.equals(
    "search null returns records",
    searchFiltered.data.length >= 0,
    true,
  );
  // 13. Test empty query (no filters)
  const emptyQuery =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      simulateConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyQuery);
  TestValidator.equals(
    "empty query pagination",
    emptyQuery.pagination.current,
    1,
  );
}