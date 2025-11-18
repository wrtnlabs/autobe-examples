import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerFeeCharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerFeeCharge";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerFeeCharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeCharge";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";

export async function test_api_admin_search_seller_fee_charges_pagination_and_sorting(
  connection: api.IConnection,
) {
  /**
   * Scenario: Validate pagination and sorting for admin seller fee charge
   * search.
   *
   * Business goal: Ensure that the admin-only search endpoint for seller fee
   * charges correctly handles page/limit parameters and sorting by a
   * deterministic field, and that pagination metadata reflects the dataset size
   * across multiple pages.
   *
   * High-level steps:
   *
   * 1. Register an admin using POST /auth/admin/join. The SDK will attach the
   *    Authorization header for subsequent admin calls automatically.
   * 2. Generate a fixed sellerId (UUID string) and currency code.
   * 3. Create 25 seller fee charges for that sellerId and currency using POST
   *    /shoppingMall/admin/sellerFeeCharges, varying `effectiveDate` and
   *    `amount` so that ordering can be observed.
   * 4. Call PATCH /shoppingMall/admin/sellerFeeCharges with
   *    IShoppingMallSellerFeeCharge.IRequest using:
   *
   *    - SellerId filter matching the created charges
   *    - Page=1, limit=10
   *    - SortBy="effectiveDate", sortDirection="desc" Then assert:
   *    - Pagination.current === 1
   *    - Pagination.limit === 10
   *    - Pagination.records >= 25
   *    - Pagination.pages >= 3
   *    - Data.length === 10
   *    - Data is sorted by effectiveDate descending.
   * 5. Call the same search with page=2 and the same sort/filter criteria and
   *    assert:
   *
   *    - Pagination.current === 2
   *    - Data.length === 10
   *    - Ids on page 1 and page 2 do not overlap
   *    - Page 2 data is also sorted descending.
   * 6. Call the search with page=3, same filter/sort, and assert:
   *
   *    - Pagination.current === 3
   *    - Data.length === 5 (remaining records)
   *    - Still sorted descending.
   * 7. Finally, call the search again with page=1, limit=10,
   *
   *    - SortBy="effectiveDate", sortDirection="asc" and assert the returned list is
   *         sorted ascending and that the ids are the reverse order relative to
   *         the descending-first-page subset.
   */

  // 1. Register admin and let SDK attach Authorization header
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare common sellerId and currency
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const currency = "KRW";

  // 3. Create 25 seller fee charges for same sellerId and currency
  const totalCharges = 25;
  const createdCharges: IShoppingMallSellerFeeCharge[] = [];
  const now = new Date();

  for (let i = 0; i < totalCharges; i++) {
    // Spread effectiveDate across +/- totalCharges days to ensure uniqueness
    const effectiveDate = new Date(
      now.getTime() + (i - Math.floor(totalCharges / 2)) * 24 * 60 * 60 * 1000,
    ).toISOString();

    const createBody = {
      sellerId,
      orderId: null,
      paymentRefundId: null,
      sellerPayoutItemId: null,
      feeType: "transaction_commission",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      currency,
      amount: 1000 + i * 10,
      taxAmount: 100 + i,
      isPlatformRevenue: true,
      effectiveDate,
    } satisfies IShoppingMallSellerFeeCharge.ICreate;

    const created: IShoppingMallSellerFeeCharge =
      await api.functional.shoppingMall.admin.sellerFeeCharges.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    createdCharges.push(created);
  }

  // Helper to assert array is sorted by effectiveDate in a given direction
  const assertSortedByEffectiveDate = (
    title: string,
    data: IShoppingMallSellerFeeCharge.ISummary[],
    direction: "asc" | "desc",
  ): void => {
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].effectiveDate).getTime();
      const curr = new Date(data[i].effectiveDate).getTime();
      if (direction === "asc") {
        TestValidator.predicate(
          `${title} ascending order at index ${i}`,
          prev <= curr,
        );
      } else {
        TestValidator.predicate(
          `${title} descending order at index ${i}`,
          prev >= curr,
        );
      }
    }
  };

  // 4. Page 1, limit 10, sort desc by effectiveDate
  const page1Request = {
    sellerId,
    page: 1,
    limit: 10,
    sortBy: "effectiveDate",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerFeeCharge.IRequest;

  const page1: IPageIShoppingMallSellerFeeCharge.ISummary =
    await api.functional.shoppingMall.admin.sellerFeeCharges.index(connection, {
      body: page1Request,
    });
  typia.assert(page1);

  TestValidator.equals(
    "page1 current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page1 limit should be 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page1 total records should be at least 25",
    page1.pagination.records >= totalCharges,
  );
  TestValidator.predicate(
    "page1 total pages should be at least 3",
    page1.pagination.pages >= 3,
  );
  TestValidator.equals(
    "page1 should contain 10 records",
    page1.data.length,
    10,
  );
  assertSortedByEffectiveDate(
    "page1 descending by effectiveDate",
    page1.data,
    "desc",
  );

  const page1Ids = page1.data.map((d) => d.id);

  // 5. Page 2, same filter and sorting
  const page2Request = {
    sellerId,
    page: 2,
    limit: 10,
    sortBy: "effectiveDate",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerFeeCharge.IRequest;

  const page2: IPageIShoppingMallSellerFeeCharge.ISummary =
    await api.functional.shoppingMall.admin.sellerFeeCharges.index(connection, {
      body: page2Request,
    });
  typia.assert(page2);

  TestValidator.equals(
    "page2 current page should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page2 limit should be 10", page2.pagination.limit, 10);
  TestValidator.equals(
    "page2 should contain 10 records",
    page2.data.length,
    10,
  );
  assertSortedByEffectiveDate(
    "page2 descending by effectiveDate",
    page2.data,
    "desc",
  );

  const page2Ids = page2.data.map((d) => d.id);

  // Ensure no overlap between page1 and page2 ids
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page1 and page2 should have no overlapping ids",
    overlap.length,
    0,
  );

  // 6. Page 3, remaining records, still sorted desc
  const page3Request = {
    sellerId,
    page: 3,
    limit: 10,
    sortBy: "effectiveDate",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerFeeCharge.IRequest;

  const page3: IPageIShoppingMallSellerFeeCharge.ISummary =
    await api.functional.shoppingMall.admin.sellerFeeCharges.index(connection, {
      body: page3Request,
    });
  typia.assert(page3);

  TestValidator.equals(
    "page3 current page should be 3",
    page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page3 should contain remaining 5 records",
    page3.data.length,
    totalCharges - 20,
  );
  assertSortedByEffectiveDate(
    "page3 descending by effectiveDate",
    page3.data,
    "desc",
  );

  // 7. Ascending sort: page 1 asc and check order vs desc
  const ascPage1Request = {
    sellerId,
    page: 1,
    limit: 10,
    sortBy: "effectiveDate",
    sortDirection: "asc",
  } satisfies IShoppingMallSellerFeeCharge.IRequest;

  const ascPage1: IPageIShoppingMallSellerFeeCharge.ISummary =
    await api.functional.shoppingMall.admin.sellerFeeCharges.index(connection, {
      body: ascPage1Request,
    });
  typia.assert(ascPage1);

  TestValidator.equals(
    "asc page1 current page should be 1",
    ascPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "asc page1 limit should be 10",
    ascPage1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "asc page1 should contain 10 records",
    ascPage1.data.length,
    10,
  );
  assertSortedByEffectiveDate(
    "page1 ascending by effectiveDate",
    ascPage1.data,
    "asc",
  );

  const ascPage1Ids = ascPage1.data.map((d) => d.id);

  // While we cannot guarantee strict reverse identity across server
  // implementation details (e.g., tie-breaking fields), at least check that
  // the first item in ascending equals the last in descending when dataset
  // has strictly increasing effectiveDate.
  TestValidator.equals(
    "first asc id should match last desc id on page1",
    ascPage1Ids[0],
    page1Ids[page1Ids.length - 1],
  );
}
