import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_history_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for inventory history access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(6)}@test.com`,
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate test variant ID
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple inventory history records for testing
  const recordsCount = 45;
  const records: IShoppingMallInventoryHistory.ISummary[] = [];
  for (let i = 0; i < recordsCount; i++) {
    const createdAt = new Date(2026, 0, 1).getTime() + i * 24 * 60 * 60 * 1000;
    const reason = (
      [
        "order",
        "order_cancellation",
        "refund",
        "restock",
        "adjustment",
        "loss",
      ] as const
    )[i % 6];
    const record: IShoppingMallInventoryHistory.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      quantity_change: i % 2 === 0 ? 10 : -5,
      reason: reason,
      created_at: new Date(createdAt).toISOString(),
      metadata: i % 3 === 0 ? JSON.stringify({ note: `Record ${i}` }) : null,
      shopping_mall_product_variant_id: variantId,
      shopping_mall_order_item_id:
        i % 5 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
      shopping_mall_seller_id:
        i % 7 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
    };
    records.push(record);
  }
  // Test 1: Default pagination (page=1, limit=20)
  {
    const response1 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: {},
        },
      );
    typia.assert(response1);
    TestValidator.equals("default page count", response1.pagination.current, 1);
    TestValidator.equals("default limit", response1.pagination.limit, 20);
    TestValidator.equals(
      "default records count",
      response1.pagination.records,
      recordsCount,
    );
    TestValidator.equals(
      "default pages count",
      response1.pagination.pages,
      Math.ceil(recordsCount / 20),
    );
    TestValidator.equals("default data length", response1.data.length, 20);
  }
  // Test 2: Custom pagination (page=2, limit=15)
  {
    const response2 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { page: 2, limit: 15 },
        },
      );
    typia.assert(response2);
    TestValidator.equals("custom page count", response2.pagination.current, 2);
    TestValidator.equals("custom limit", response2.pagination.limit, 15);
    TestValidator.equals("custom data length", response2.data.length, 15);
  }
  // Test 3: Last page with partial data
  {
    const lastPage = Math.ceil(recordsCount / 10);
    const response3 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { page: lastPage, limit: 10 },
        },
      );
    typia.assert(response3);
    TestValidator.equals(
      "last page number",
      response3.pagination.current,
      lastPage,
    );
    TestValidator.equals(
      "last page records",
      response3.pagination.records,
      recordsCount,
    );
    const expectedLastPageLength =
      recordsCount % 10 === 0 ? 10 : recordsCount % 10;
    TestValidator.equals(
      "last page data length",
      response3.data.length,
      expectedLastPageLength,
    );
  }
  // Test 4: Filter by reason codes
  {
    const orderRecords = records.filter((r) => r.reason === "order");
    const response4 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { reason: ["order"] },
        },
      );
    typia.assert(response4);
    TestValidator.equals(
      "reason filter count",
      response4.pagination.records,
      orderRecords.length,
    );
    TestValidator.predicate(
      "all filtered records are order",
      response4.data.every((r) => r.reason === "order"),
    );
  }
  // Test 5: Filter by multiple reason codes
  {
    const filteredRecords = records.filter((r) =>
      ["order", "refund"].includes(r.reason),
    );
    const response5 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { reason: ["order", "refund"] },
        },
      );
    typia.assert(response5);
    TestValidator.equals(
      "multiple reason filter count",
      response5.pagination.records,
      filteredRecords.length,
    );
  }
  // Test 6: Date range filtering
  {
    const startDate = new Date(2026, 0, 10).toISOString();
    const endDate = new Date(2026, 0, 20).toISOString();
    const dateRangeRecords = records.filter((r) => {
      const recordDate = new Date(r.created_at).getTime();
      return (
        recordDate >= new Date(startDate).getTime() &&
        recordDate <= new Date(endDate).getTime()
      );
    });
    const response6 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { created_at_range: [startDate, endDate] },
        },
      );
    typia.assert(response6);
    TestValidator.equals(
      "date range filter count",
      response6.pagination.records,
      dateRangeRecords.length,
    );
    TestValidator.predicate(
      "all records in date range",
      response6.data.every((r) => {
        const recordDate = new Date(r.created_at).getTime();
        return (
          recordDate >= new Date(startDate).getTime() &&
          recordDate <= new Date(endDate).getTime()
        );
      }),
    );
  }
  // Test 7: Sorting by created_at ascending
  {
    const sortedRecords = [...records].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const response7 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { sort_by: "created_at", sort_order: "asc", limit: 20 },
        },
      );
    typia.assert(response7);
    TestValidator.equals(
      "ascending sort records",
      response7.pagination.records,
      Math.min(20, recordsCount),
    );
    if (response7.data.length > 0 && sortedRecords.length > 0) {
      TestValidator.equals(
        "first record matches",
        response7.data[0].created_at,
        sortedRecords[0].created_at,
      );
    }
  }
  // Test 8: Sorting by created_at descending
  {
    const sortedRecords = [...records].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const response8 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { sort_by: "created_at", sort_order: "desc", limit: 20 },
        },
      );
    typia.assert(response8);
    TestValidator.equals(
      "descending sort records",
      response8.pagination.records,
      Math.min(20, recordsCount),
    );
    if (response8.data.length > 0 && sortedRecords.length > 0) {
      TestValidator.equals(
        "first record matches",
        response8.data[0].created_at,
        sortedRecords[0].created_at,
      );
    }
  }
  // Test 9: Combined filters (reason + date range + sorting)
  {
    const startDate = new Date(2026, 0, 10).toISOString();
    const endDate = new Date(2026, 0, 20).toISOString();
    const filteredRecords = records
      .filter((r) => r.reason === "order")
      .filter((r) => {
        const recordDate = new Date(r.created_at).getTime();
        return (
          recordDate >= new Date(startDate).getTime() &&
          recordDate <= new Date(endDate).getTime()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    const response9 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: {
            reason: ["order"],
            created_at_range: [startDate, endDate],
            sort_by: "created_at",
            sort_order: "asc",
          },
        },
      );
    typia.assert(response9);
    TestValidator.equals(
      "combined filter count",
      response9.pagination.records,
      filteredRecords.length,
    );
    TestValidator.predicate(
      "all records match reason",
      response9.data.every((r) => r.reason === "order"),
    );
    TestValidator.predicate(
      "all records in date range",
      response9.data.every((r) => {
        const recordDate = new Date(r.created_at).getTime();
        return (
          recordDate >= new Date(startDate).getTime() &&
          recordDate <= new Date(endDate).getTime()
        );
      }),
    );
  }
  // Test 10: Empty results
  {
    const farFutureDate = new Date(2030, 0, 1).toISOString();
    const response10 =
      await api.functional.shoppingMall.admin.inventory_history.variants.index(
        adminConnection,
        {
          variantId,
          body: { created_at_range: [farFutureDate, farFutureDate] },
        },
      );
    typia.assert(response10);
    TestValidator.equals(
      "empty results count",
      response10.pagination.records,
      0,
    );
    TestValidator.equals("empty results data", response10.data.length, 0);
  }
}
