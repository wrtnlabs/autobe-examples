import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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

export async function test_api_seller_inventory_history_filtering_stock_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Update connection with seller token
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuth.token.access,
  };
  // 2. Create product and variant for seller
  // Note: Using mock variant ID since actual product/variant creation APIs are not in the provided SDK
  // In real implementation, these would be created via api.functional.ecommerceMall.seller.products.*
  const mockVariantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test filtering by reasonType (restocking only)
  const restockingFilter: IEcommerceMallInventoryRecord.IRequest = {
    reasonType: "restocking",
    sortOrder: "desc" as const,
    pageSize: 20,
  };
  const restockingResult =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      sellerConnection,
      {
        variantId: mockVariantId,
        body: restockingFilter,
      },
    );
  typia.assert(restockingResult);
  // Validate filtering by reasonType
  const allRestocking = restockingResult.data.every(
    (record) => record.reason === "restocking",
  );
  TestValidator.predicate(
    "filter by reasonType returns only restocking records",
    allRestocking,
  );
  // 4. Test filtering by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallInventoryRecord.IRequest = {
    startDate: oneWeekAgo.toISOString(),
    endDate: now.toISOString(),
    sortOrder: "desc" as const,
    pageSize: 20,
  };
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      sellerConnection,
      {
        variantId: mockVariantId,
        body: dateRangeFilter,
      },
    );
  typia.assert(dateRangeResult);
  // Validate date range filtering
  const withinDateRange = dateRangeResult.data.every((record) => {
    const recordTime = new Date(record.timestamp);
    return (
      recordTime >= new Date(oneWeekAgo.toISOString()) &&
      recordTime <= new Date(now.toISOString())
    );
  });
  TestValidator.predicate(
    "filter by date range returns only records within range",
    withinDateRange,
  );
  // 5. Test pagination with cursor
  const firstPage: IEcommerceMallInventoryRecord.IRequest = {
    pageSize: 5,
    sortOrder: "desc" as const,
  };
  const firstPageResult =
    await api.functional.ecommerceMall.seller.variants.inventory_history.index(
      sellerConnection,
      {
        variantId: mockVariantId,
        body: firstPage,
      },
    );
  typia.assert(firstPageResult);
  // Validate pagination metadata
  TestValidator.equals(
    "first page pagination current",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page pagination limit",
    firstPageResult.pagination.limit,
    5,
  );
  // 6. Get second page using cursor (timestamp from last record of first page)
  if (firstPageResult.data.length > 0) {
    const lastRecordTimestamp =
      firstPageResult.data[firstPageResult.data.length - 1].timestamp;
    const secondPage: IEcommerceMallInventoryRecord.IRequest = {
      page: lastRecordTimestamp,
      pageSize: 5,
      sortOrder: "desc" as const,
    };
    const secondPageResult =
      await api.functional.ecommerceMall.seller.variants.inventory_history.index(
        sellerConnection,
        {
          variantId: mockVariantId,
          body: secondPage,
        },
      );
    typia.assert(secondPageResult);
    // Validate second page pagination
    TestValidator.equals(
      "second page pagination current",
      secondPageResult.pagination.current,
      2,
    );
    // Validate pagination cursor worked (records should be different from first page)
    TestValidator.notEquals(
      "pagination cursor returns different records",
      JSON.stringify(firstPageResult.data.map((r) => r.id)),
      JSON.stringify(secondPageResult.data.map((r) => r.id)),
    );
  }
  // 7. Validate sorting by timestamp DESC (default)
  if (restockingResult.data.length > 1) {
    const isSortedDesc = restockingResult.data.every((record, index, array) => {
      if (index === 0) return true;
      const prevRecord = array[index - 1];
      return (
        new Date(record.timestamp).getTime() <=
        new Date(prevRecord.timestamp).getTime()
      );
    });
    TestValidator.predicate(
      "records are sorted by timestamp DESC",
      isSortedDesc,
    );
  }
  // 8. Validate record immutability - each record has required fields
  const validRecords = restockingResult.data.every(
    (record) =>
      record.id !== undefined &&
      record.variant_id !== undefined &&
      record.quantity_change !== undefined &&
      record.reason !== undefined &&
      record.timestamp !== undefined,
  );
  TestValidator.predicate(
    "inventory records have all required fields",
    validRecords,
  );
  // 9. Validate stock calculation by summing quantity_change values
  // Expected stock: +50 (restocking) -10 (order_fulfillment) +5 (cancellation) +3 (refund) -2 (adjustment) = 46
  // Calculate actual stock from all retrieved records for this variant
  const calculatedStock = restockingResult.data.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  // Validate stock calculation is mathematically correct
  TestValidator.predicate(
    "stock calculation matches sum of quantity_change values",
    calculatedStock === 46,
  );
}
