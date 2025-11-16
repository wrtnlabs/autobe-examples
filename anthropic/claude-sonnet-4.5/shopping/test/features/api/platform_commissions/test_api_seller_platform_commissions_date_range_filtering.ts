import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test date range filtering for platform commission records using created_after
 * and created_before parameters.
 *
 * This test validates the date range filtering functionality of the platform
 * commission search API. It verifies that filtering returns only commission
 * records created within the specified time boundaries, and handles various
 * scenarios including filtering by only created_after, only created_before, and
 * both parameters together to define a specific time window.
 *
 * The test also verifies that ISO 8601 datetime format is properly handled and
 * that boundary conditions are correctly applied. Edge cases such as date
 * ranges with no matching records, overlapping date ranges, and future dates
 * are tested to ensure robust filtering behavior.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a seller account
 * 2. Retrieve existing platform commission records to use for filtering tests
 * 3. Test filtering with only created_after parameter
 * 4. Test filtering with only created_before parameter
 * 5. Test filtering with both created_after and created_before together
 * 6. Test edge cases: future date ranges, no matching records
 * 7. Validate that all returned records match the specified date criteria
 */
export async function test_api_seller_platform_commissions_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: "https://marketplace.example.com/seller/register",
        referrer: "https://marketplace.example.com/home",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Retrieve all platform commission records for the seller
  const allCommissionsResponse: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(allCommissionsResponse);

  // If there are no commission records, we can only test that empty results work correctly
  if (allCommissionsResponse.data.length === 0) {
    // Test with future date range (should return empty)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureResponse: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            created_after: futureDate.toISOString(),
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(futureResponse);
    TestValidator.equals(
      "future date range returns empty",
      futureResponse.data.length,
      0,
    );
    return;
  }

  // Sort commissions by creation date to identify time boundaries
  const sortedCommissions = [...allCommissionsResponse.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const earliestDate = new Date(sortedCommissions[0].created_at);
  const latestDate = new Date(
    sortedCommissions[sortedCommissions.length - 1].created_at,
  );
  const midpointIndex = Math.floor(sortedCommissions.length / 2);
  const midpointDate = new Date(sortedCommissions[midpointIndex].created_at);

  // Step 3: Test filtering with only created_after parameter
  const afterResponse: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_after: midpointDate.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(afterResponse);

  // Validate all returned records are created after the specified date
  const midpointTimestamp = midpointDate.getTime();
  TestValidator.predicate(
    "all records after midpoint date",
    afterResponse.data.every(
      (commission) =>
        new Date(commission.created_at).getTime() >= midpointTimestamp,
    ),
  );

  // Step 4: Test filtering with only created_before parameter
  const beforeResponse: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_before: midpointDate.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(beforeResponse);

  // Validate all returned records are created before the specified date
  TestValidator.predicate(
    "all records before midpoint date",
    beforeResponse.data.every(
      (commission) =>
        new Date(commission.created_at).getTime() <= midpointTimestamp,
    ),
  );

  // Step 5: Test filtering with both created_after and created_before together
  const quarterIndex = Math.floor(sortedCommissions.length / 4);
  const threeQuarterIndex = Math.floor((sortedCommissions.length * 3) / 4);
  const startDate = new Date(sortedCommissions[quarterIndex].created_at);
  const endDate = new Date(sortedCommissions[threeQuarterIndex].created_at);

  const rangeResponse: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_after: startDate.toISOString(),
          created_before: endDate.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(rangeResponse);

  // Validate all returned records are within the specified date range
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();
  TestValidator.predicate(
    "all records within date range",
    rangeResponse.data.every((commission) => {
      const timestamp = new Date(commission.created_at).getTime();
      return timestamp >= startTimestamp && timestamp <= endTimestamp;
    }),
  );

  // Step 6: Test edge case - future date range (should return empty)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureResponse: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_after: futureDate.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date range returns empty",
    futureResponse.data.length,
    0,
  );

  // Step 7: Test edge case - past date range that excludes all records
  const veryOldDate = new Date(earliestDate);
  veryOldDate.setFullYear(veryOldDate.getFullYear() - 2);
  const veryOldEndDate = new Date(earliestDate);
  veryOldEndDate.setDate(veryOldEndDate.getDate() - 1);

  const pastResponse: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_after: veryOldDate.toISOString(),
          created_before: veryOldEndDate.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(pastResponse);
  TestValidator.equals(
    "past date range with no matches returns empty",
    pastResponse.data.length,
    0,
  );

  // Step 8: Validate pagination metadata is correct for filtered results
  TestValidator.predicate(
    "pagination current page is 1",
    rangeResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    rangeResponse.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    rangeResponse.pagination.records >= rangeResponse.data.length,
  );
}
