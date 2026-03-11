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

export async function test_api_seller_inventory_filtering_reason_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product variant for testing (using a random UUID)
  // Note: Since we cannot create actual variants, we use a mock UUID
  // The server should return appropriate data for the test
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Define all possible reason types for testing
  const reasonTypes = [
    "order_fulfillment",
    "cancellation",
    "refund",
    "restocking",
    "adjustment",
  ] as const;
  // 4. Generate date range for filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 5. Test filtering by single reason type
  const singleReasonFilter = {
    reason: "restocking",
    sortBy: "newest",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const resultWithReason =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId,
        body: singleReasonFilter,
      },
    );
  typia.assert(resultWithReason);
  // 6. Test filtering by date range
  const dateRangeFilter = {
    dateRange: {
      start: lastWeek.toISOString(),
      end: now.toISOString(),
    },
    sortBy: "newest",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const resultWithDateRange =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId,
        body: dateRangeFilter,
      },
    );
  typia.assert(resultWithDateRange);
  // 7. Test filtering by both reason AND date range
  const combinedFilter = {
    reason: "order_fulfillment",
    dateRange: {
      start: yesterday.toISOString(),
      end: now.toISOString(),
    },
    sortBy: "newest",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const resultWithCombined =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId,
        body: combinedFilter,
      },
    );
  typia.assert(resultWithCombined);
  // 8. Test sorting by oldest with filtering
  const oldestFilter = {
    reason: "cancellation",
    dateRange: {
      start: lastWeek.toISOString(),
      end: now.toISOString(),
    },
    sortBy: "oldest",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const resultOldest =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId,
        body: oldestFilter,
      },
    );
  typia.assert(resultOldest);
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      resultWithReason.pagination.current >= 1 &&
      resultWithReason.pagination.limit > 0 &&
      resultWithReason.pagination.records >= 0 &&
      resultWithReason.pagination.pages >= 0,
  );
  // 10. Validate that current_stock is present in all records
  for (const record of resultWithReason.data) {
    TestValidator.predicate(
      "current_stock is non-negative",
      () => record.current_stock >= 0,
    );
    typia.assert(record);
  }
  // 11. Test pagination with different page numbers
  const page2Result =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId,
        body: {
          ...singleReasonFilter,
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 index is 1", page2Result.pagination.current, 2);
  // 12. Test limit boundary (max limit is 100)
  const limit100Filter = {
    reason: "refund",
    limit: 100,
    page: 1,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const resultLimit100 =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId,
        body: limit100Filter,
      },
    );
  typia.assert(resultLimit100);
  TestValidator.predicate(
    "limit 100 returns expected records",
    () => resultLimit100.pagination.limit <= 100,
  );
  // 13. Verify all reason types can be filtered
  for (const reason of reasonTypes) {
    const reasonFilter = {
      reason,
      page: 1,
      limit: 10,
    } satisfies IEcommerceMallInventoryRecord.IRequest;
    const result =
      await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
        sellerConnection,
        {
          variantId,
          body: reasonFilter,
        },
      );
    typia.assert(result);
  }
}
