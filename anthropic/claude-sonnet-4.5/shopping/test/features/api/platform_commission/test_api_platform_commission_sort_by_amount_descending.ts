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
 * Test sorting platform commission records by commission_amount in descending
 * order.
 *
 * This test validates the sorting functionality of the platform commission
 * search API to ensure that commission records are correctly ordered from
 * highest to lowest commission value. This is essential for financial analysis
 * workflows that prioritize high-value revenue transactions.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to access commission analytics
 * 2. Submit search request with sort_by="commission_amount" and sort_order="desc"
 * 3. Retrieve and validate the sorted commission records
 * 4. Verify descending order of commission amounts
 * 5. Confirm pagination metadata consistency
 */
export async function test_api_platform_commission_sort_by_amount_descending(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Search platform commissions sorted by commission_amount in descending order
  const searchRequest = {
    page: 1,
    limit: 20,
    sort_by: "commission_amount" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const commissionPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(commissionPage);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    commissionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    commissionPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    commissionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    commissionPage.pagination.pages >= 0,
  );

  // Step 4: Validate descending sort order by commission_amount
  if (commissionPage.data.length > 1) {
    for (let i = 0; i < commissionPage.data.length - 1; i++) {
      const current = commissionPage.data[i];
      const next = commissionPage.data[i + 1];

      TestValidator.predicate(
        `commission at index ${i} (${current.commission_amount}) should be >= commission at index ${i + 1} (${next.commission_amount})`,
        current.commission_amount >= next.commission_amount,
      );
    }
  }

  // Step 5: Verify data array length matches pagination limits
  TestValidator.predicate(
    "data array length should not exceed limit",
    commissionPage.data.length <= commissionPage.pagination.limit,
  );

  // Step 6: If there are records, validate each commission record structure
  commissionPage.data.forEach((commission, index) => {
    TestValidator.predicate(
      `commission ${index} should have valid commission_amount`,
      commission.commission_amount >= 0,
    );
    TestValidator.predicate(
      `commission ${index} should have valid commission_rate`,
      commission.commission_rate >= 0 && commission.commission_rate <= 1,
    );
    TestValidator.predicate(
      `commission ${index} should have valid order_subtotal`,
      commission.order_subtotal >= 0,
    );
  });
}
