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
 * Test that platform administrators can access commission records for any
 * seller.
 *
 * This test validates that admins have cross-seller visibility for financial
 * oversight and platform revenue management purposes. It verifies that
 * administrators can retrieve commission records for any seller in the
 * marketplace by their seller ID, confirming proper authorization checks that
 * grant admin-level access to all seller commission data for governance and
 * financial reconciliation workflows.
 *
 * Test Steps:
 *
 * 1. Create and authenticate admin account with platform-wide access
 * 2. Generate test seller ID to query commission records
 * 3. Call commission search endpoint for the specified seller
 * 4. Validate successful response with proper pagination structure
 * 5. Verify commission data access is granted to admin
 */
export async function test_api_admin_seller_platform_commissions_access_any_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Generate a seller ID to query (simulating accessing any seller's data)
  const targetSellerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Call commission search endpoint for the specified seller
  const commissionRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const commissionPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: targetSellerId,
        body: commissionRequest,
      },
    );
  typia.assert(commissionPage);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "response should have pagination object",
    commissionPage.pagination !== null &&
      commissionPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(commissionPage.data),
  );

  // Step 5: Verify pagination metadata is valid
  TestValidator.equals(
    "current page should match request",
    commissionPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "page limit should match request",
    commissionPage.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    commissionPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    commissionPage.pagination.pages >= 0,
  );
}
