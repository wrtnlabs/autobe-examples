import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test filtering platform commission records by commission amount range.
 *
 * This test validates the amount-based filtering functionality for platform
 * commission records using min_commission_amount and max_commission_amount
 * parameters. It ensures that the search API correctly filters commission
 * records based on monetary value ranges, which is essential for financial
 * analysis workflows such as segmenting revenue by transaction size and
 * identifying high-value commission events.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access commission analytics endpoints
 * 2. Retrieve all commission records to understand data distribution
 * 3. Analyze commission amounts to select appropriate test ranges
 * 4. Test filtering with minimum amount only
 * 5. Test filtering with maximum amount only
 * 6. Test filtering with both minimum and maximum amount range
 * 7. Validate boundary inclusivity and result accuracy
 * 8. Verify pagination works correctly with amount filtering
 */
export async function test_api_platform_commission_filter_by_amount_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve all commission records to understand data distribution
  const allCommissionsPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(allCommissionsPage);

  // If no commission data exists, we cannot test filtering
  if (allCommissionsPage.data.length === 0) {
    return;
  }

  // Step 3: Analyze commission amounts to determine test ranges
  const commissionAmounts = allCommissionsPage.data.map(
    (c) => c.commission_amount,
  );
  const minAmount = Math.min(...commissionAmounts);
  const maxAmount = Math.max(...commissionAmounts);
  const midAmount = (minAmount + maxAmount) / 2;

  // Step 4: Test filtering with minimum amount only
  const minFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          min_commission_amount: midAmount,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(minFilteredPage);

  // Validate all returned records meet minimum amount requirement
  for (const commission of minFilteredPage.data) {
    TestValidator.predicate(
      "commission amount meets minimum requirement",
      commission.commission_amount >= midAmount,
    );
  }

  // Step 5: Test filtering with maximum amount only
  const maxFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          max_commission_amount: midAmount,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(maxFilteredPage);

  // Validate all returned records meet maximum amount requirement
  for (const commission of maxFilteredPage.data) {
    TestValidator.predicate(
      "commission amount meets maximum requirement",
      commission.commission_amount <= midAmount,
    );
  }

  // Step 6: Test filtering with both minimum and maximum amount range
  const rangeFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          min_commission_amount: minAmount,
          max_commission_amount: maxAmount,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(rangeFilteredPage);

  // Validate all returned records fall within the specified range
  for (const commission of rangeFilteredPage.data) {
    TestValidator.predicate(
      "commission amount within specified range",
      commission.commission_amount >= minAmount &&
        commission.commission_amount <= maxAmount,
    );
  }

  // Step 7: Test boundary inclusivity with exact amount values
  if (allCommissionsPage.data.length > 0) {
    const exactAmount = allCommissionsPage.data[0].commission_amount;

    const exactMinPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.admin.platformCommissions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: exactAmount,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(exactMinPage);

    // The exact amount should be included (boundary is inclusive)
    const foundInMin = exactMinPage.data.some(
      (c) => c.commission_amount === exactAmount,
    );
    TestValidator.predicate("minimum boundary is inclusive", foundInMin);

    const exactMaxPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.admin.platformCommissions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            max_commission_amount: exactAmount,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(exactMaxPage);

    // The exact amount should be included (boundary is inclusive)
    const foundInMax = exactMaxPage.data.some(
      (c) => c.commission_amount === exactAmount,
    );
    TestValidator.predicate("maximum boundary is inclusive", foundInMax);
  }

  // Step 8: Test pagination with amount filtering
  const paginatedPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          min_commission_amount: minAmount,
          max_commission_amount: maxAmount,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(paginatedPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is correct",
    paginatedPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    paginatedPage.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginatedPage.pagination.pages >= 0,
  );

  // Step 9: Test with narrower range to verify exclusion
  if (maxAmount > minAmount) {
    const narrowMin = minAmount + (maxAmount - minAmount) * 0.25;
    const narrowMax = minAmount + (maxAmount - minAmount) * 0.75;

    const narrowRangePage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.admin.platformCommissions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: narrowMin,
            max_commission_amount: narrowMax,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(narrowRangePage);

    // Verify all results are within narrow range
    for (const commission of narrowRangePage.data) {
      TestValidator.predicate(
        "commission amount within narrow range",
        commission.commission_amount >= narrowMin &&
          commission.commission_amount <= narrowMax,
      );
    }

    // Verify records outside range are excluded
    const recordsBelowMin = allCommissionsPage.data.filter(
      (c) => c.commission_amount < narrowMin,
    );
    const recordsAboveMax = allCommissionsPage.data.filter(
      (c) => c.commission_amount > narrowMax,
    );

    for (const excluded of [...recordsBelowMin, ...recordsAboveMax]) {
      const foundInNarrow = narrowRangePage.data.some(
        (c) => c.id === excluded.id,
      );
      TestValidator.predicate(
        "records outside range are excluded",
        !foundInNarrow,
      );
    }
  }
}
