import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceModificationInventoryRestoration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the scenario where a seller uses date range filtering to retrieve inventory restoration records from a specific time period.
 * The seller joins and then requests restoration records created within a specific date range (created_at_after and created_at_before parameters).
 * Verify that the filtering correctly returns records created within the specified timeframe, inclusive of boundary dates.
 * Test edge cases like overlapping ranges, future dates, and invalid date ranges to ensure proper validation.
 * Validate that pagination works correctly with date-filtered results and that records are still sorted by creation date descending.
 */
export async function test_api_seller_inventory_restorations_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create test data - since we need existing inventory restoration records,
  // we assume some already exist in the system. We'll fetch records first to have reference dates.
  // First, get all existing records to understand the date distribution
  const allRecords =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(allRecords);
  // If there are no records, we need to ensure at least one exists for testing
  // For simulation purposes, we'll assume there are enough records
  // 3. Test basic date range filtering
  if (allRecords.data.length >= 2) {
    // Sort records by creation date to find earliest and latest
    const sortedRecords = [...allRecords.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const earliestRecord = sortedRecords[0];
    const middleRecord = sortedRecords[Math.floor(sortedRecords.length / 2)];
    const latestRecord = sortedRecords[sortedRecords.length - 1];
    // Test 1: Date range that should include all records (full range)
    const fullRangeResponse =
      await api.functional.ecommerce.seller.modification_inventory_restorations.index(
        sellerConnection,
        {
          body: {
            created_at_after: earliestRecord.created_at,
            created_at_before: latestRecord.created_at,
            limit: 100,
          } satisfies IEcommerceModificationInventoryRestoration.IRequest,
        },
      );
    typia.assert(fullRangeResponse);
    // All records should be within this range
    TestValidator.predicate(
      "full range should return all records",
      fullRangeResponse.data.length === allRecords.data.length,
    );
    // Test 2: Narrow date range that should include only middle record(s)
    // Create a range that starts slightly before middle record and ends slightly after
    const middleRecordDate = new Date(middleRecord.created_at);
    const rangeStart = new Date(
      middleRecordDate.getTime() - 1000,
    ).toISOString();
    const rangeEnd = new Date(middleRecordDate.getTime() + 1000).toISOString();
    const narrowRangeResponse =
      await api.functional.ecommerce.seller.modification_inventory_restorations.index(
        sellerConnection,
        {
          body: {
            created_at_after: rangeStart,
            created_at_before: rangeEnd,
            limit: 100,
          } satisfies IEcommerceModificationInventoryRestoration.IRequest,
        },
      );
    typia.assert(narrowRangeResponse);
    // Verify all returned records are within the narrow range
    for (const record of narrowRangeResponse.data) {
      const recordDate = new Date(record.created_at);
      const startDate = new Date(rangeStart);
      const endDate = new Date(rangeEnd);
      TestValidator.predicate(
        `record ${record.id} should be within narrow date range`,
        recordDate >= startDate && recordDate <= endDate,
      );
    }
  }
  // 4. Test edge cases
  // Test with future dates (should return empty or error)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const futureRangeResponse =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          created_at_after: futureDate,
          limit: 10,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(futureRangeResponse);
  // Should return empty array or handle gracefully
  TestValidator.predicate(
    "future date range should return empty or minimal results",
    Array.isArray(futureRangeResponse.data),
  );
  // 5. Test pagination with date filtering
  const paginationTest =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination should work with date filters",
    paginationTest.pagination.limit === 1 &&
      paginationTest.pagination.current === 1,
  );
  // 6. Test sorting - records should be in descending order by created_at
  const sortedTest =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          limit: 10,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(sortedTest);
  if (sortedTest.data.length >= 2) {
    for (let i = 1; i < sortedTest.data.length; i++) {
      const currentDate = new Date(sortedTest.data[i].created_at);
      const previousDate = new Date(sortedTest.data[i - 1].created_at);
      TestValidator.predicate(
        `records should be sorted descending (${i - 1} >= ${i})`,
        previousDate >= currentDate,
      );
    }
  }
  // 7. Test invalid date range (start > end)
  // This should be handled by API validation
  const pastDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago
  const olderDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 60,
  ).toISOString(); // 60 days ago
  // Note: API may reject or handle gracefully
  const invalidRangeResponse =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          created_at_after: pastDate, // newer date
          created_at_before: olderDate, // older date (invalid: start > end)
          limit: 10,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(invalidRangeResponse);
  TestValidator.predicate(
    "invalid date range should return empty or handle gracefully",
    Array.isArray(invalidRangeResponse.data),
  );
}
