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
 * Test filtering platform commission records by a specific seller identifier.
 *
 * This test validates the seller-based commission filtering functionality
 * essential for seller payout reconciliation and revenue attribution analysis.
 * The test ensures that administrators can accurately query commission records
 * for individual sellers.
 *
 * Test workflow:
 *
 * 1. Authenticate as platform administrator to gain access to commission search
 * 2. Submit a search request with seller_id filter to retrieve seller-specific
 *    commissions
 * 3. Validate response structure and pagination are correct
 * 4. If commission records are returned, verify they belong to the specified
 *    seller
 *
 * Note: This test uses a random seller_id which may not exist in the system,
 * resulting in an empty result set. The test focuses on validating API behavior
 * and response structure rather than data presence.
 */
export async function test_api_platform_commission_filter_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin" as const,
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a random seller UUID to filter by
  const targetSellerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Submit commission search request with seller_id filter
  const searchRequest = {
    seller_id: targetSellerId,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const commissionPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(commissionPage);

  // Step 4: Validate response structure and pagination
  TestValidator.predicate(
    "pagination object exists and has valid structure",
    commissionPage.pagination !== null &&
      commissionPage.pagination !== undefined,
  );
  typia.assert(commissionPage.pagination);

  TestValidator.equals(
    "current page matches requested page",
    commissionPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit matches requested limit",
    commissionPage.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "data array exists",
    Array.isArray(commissionPage.data),
  );

  // Step 5: If commission records exist, validate they belong to the specified seller
  if (commissionPage.data.length > 0) {
    for (const commission of commissionPage.data) {
      typia.assert(commission);

      TestValidator.equals(
        "commission record seller_id matches filter",
        commission.shopping_mall_seller_id,
        targetSellerId,
      );

      TestValidator.predicate(
        "commission amount is non-negative",
        commission.commission_amount >= 0,
      );

      TestValidator.predicate(
        "commission rate is between 0 and 1",
        commission.commission_rate >= 0 && commission.commission_rate <= 1,
      );

      TestValidator.predicate(
        "refunded amount is non-negative",
        commission.refunded_amount >= 0,
      );
    }
  }
}
