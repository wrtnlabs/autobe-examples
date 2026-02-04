import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_audit_full_text_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Create test inventory records with varying reasons
  const testReasons = [
    "Bulk restock from warehouse",
    "Damaged goods adjustment",
    "Manual adjustment for inventory discrepancy",
    "Order fulfillment - customer purchase",
    "Order cancellation - refund processed",
    "Manual adjustment - quality control",
    "Bulk restock - seasonal inventory",
  ];
  // Create 20 inventory records with various reasons
  for (let i = 0; i < 20; i++) {
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          reason: testReasons[i % testReasons.length],
          sourceType: i % 2 === 0 ? "restock" : "adjustment",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  }
  // Step 3: Test full-text search for 'restock'
  const restockResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockResults);
  // Verify all results contain 'restock' in reason
  restockResults.data.forEach((record) => {
    TestValidator.predicate(
      "reason contains 'restock'",
      record.reason.toLowerCase().includes("restock"),
    );
  });
  // Verify at least 2 records were found
  TestValidator.predicate(
    "at least 2 restock records found",
    restockResults.data.length >= 2,
  );
  // Step 4: Test full-text search for 'damaged goods'
  const damagedResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "damaged goods",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(damagedResults);
  // Verify all results contain 'damaged goods' in reason
  damagedResults.data.forEach((record) => {
    TestValidator.predicate(
      "reason contains 'damaged goods'",
      record.reason.toLowerCase().includes("damaged goods"),
    );
  });
  // Verify at least 1 record was found
  TestValidator.predicate(
    "at least 1 damaged goods record found",
    damagedResults.data.length >= 1,
  );
  // Step 5: Test full-text search for 'manual adjustment'
  const manualResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "manual adjustment",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(manualResults);
  // Verify all results contain 'manual adjustment' in reason
  manualResults.data.forEach((record) => {
    TestValidator.predicate(
      "reason contains 'manual adjustment'",
      record.reason.toLowerCase().includes("manual adjustment"),
    );
  });
  // Verify at least 2 records were found
  TestValidator.predicate(
    "at least 2 manual adjustment records found",
    manualResults.data.length >= 2,
  );
  // Step 6: Test full-text search with pagination
  const firstPage =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
          pageSize: 5,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(firstPage);
  // Verify first page has exactly 5 records
  TestValidator.equals(
    "first page has 5 records",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "first page has exactly 5 items",
    firstPage.data.length,
    5,
  );
  // Get second page using cursor
  if (firstPage.data.length > 0) {
    const secondPage =
      await api.functional.shoppingMall.admin.inventory.records.index(
        adminConnection,
        {
          body: {
            reason: "restock",
            pageSize: 5,
            cursor: firstPage.data[firstPage.data.length - 1].variantId,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(secondPage);
    // Verify second page has records and different from first page
    TestValidator.predicate(
      "second page has records",
      secondPage.data.length > 0,
    );
    TestValidator.notEquals(
      "second page has different records than first page",
      firstPage.data[0].variantId,
      secondPage.data[0].variantId,
    );
  }
  // Step 7: Test sorting by createdAt
  const sortedByDateResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
          sortBy: "created_at",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedByDateResults);
  // Verify records are sorted by createdAt (ascending)
  for (let i = 0; i < sortedByDateResults.data.length - 1; i++) {
    const current = new Date(sortedByDateResults.data[i].createdAt);
    const next = new Date(sortedByDateResults.data[i + 1].createdAt);
    TestValidator.predicate(
      "records sorted by createdAt ascending",
      current <= next,
    );
  }
  // Step 8: Test sorting by quantityChange
  const sortedByQuantityResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
          sortBy: "quantity_change",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedByQuantityResults);
  // Verify records are sorted by quantityChange (ascending)
  for (let i = 0; i < sortedByQuantityResults.data.length - 1; i++) {
    const current = sortedByQuantityResults.data[i].quantityChange;
    const next = sortedByQuantityResults.data[i + 1].quantityChange;
    TestValidator.predicate(
      "records sorted by quantityChange ascending",
      current <= next,
    );
  }
  // Step 9: Test sorting by sourceType
  const sortedBySourceTypeResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
          sortBy: "source_type",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedBySourceTypeResults);
  // Verify records are sorted by sourceType (ascending)
  const sourceTypes = [
    "order_placement",
    "order_cancellation",
    "order_refund",
    "restock",
    "adjustment",
  ];
  for (let i = 0; i < sortedBySourceTypeResults.data.length - 1; i++) {
    const current = sourceTypes.indexOf(
      sortedBySourceTypeResults.data[i].sourceType,
    );
    const next = sourceTypes.indexOf(
      sortedBySourceTypeResults.data[i + 1].sourceType,
    );
    TestValidator.predicate(
      "records sorted by sourceType ascending",
      current <= next,
    );
  }
  // Step 10: Test date range filtering
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentResults =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
          startDate: weekAgo.toISOString(),
          endDate: now.toISOString(),
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(recentResults);
  // Verify all results are within the date range
  recentResults.data.forEach((record) => {
    const recordDate = new Date(record.createdAt);
    TestValidator.predicate(
      "record is within date range",
      recordDate >= weekAgo && recordDate <= now,
    );
  });
}