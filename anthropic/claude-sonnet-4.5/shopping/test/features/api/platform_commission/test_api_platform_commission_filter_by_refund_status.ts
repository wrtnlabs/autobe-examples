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
 * Test filtering platform commission records by refund status.
 *
 * This test validates the ability to filter platform commission records using
 * the is_refunded boolean parameter, enabling administrators to separate gross
 * commission revenue from net revenue after refund adjustments. This is
 * critical for accurate financial reporting and revenue reconciliation.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access commission refund analysis endpoints
 * 2. Query commissions with is_refunded=true to retrieve refunded commissions
 * 3. Query commissions with is_refunded=false to retrieve active commissions
 * 4. Validate all returned records match the specified refund status
 * 5. Verify refunded records show appropriate refunded_amount values
 * 6. Confirm pagination reflects the filtered subset correctly
 */
export async function test_api_platform_commission_filter_by_refund_status(
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

  // Step 2: Filter commissions by refund status - refunded commissions
  const refundedCommissions: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          is_refunded: true,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(refundedCommissions);

  // Step 3: Validate all refunded commission records
  TestValidator.predicate(
    "refunded commissions data is array",
    Array.isArray(refundedCommissions.data),
  );

  // Validate each refunded commission has is_refunded: true
  refundedCommissions.data.forEach((commission, index) => {
    TestValidator.equals(
      `refunded commission ${index} has is_refunded true`,
      commission.is_refunded,
      true,
    );

    // Refunded commissions should have refunded_amount >= 0
    TestValidator.predicate(
      `refunded commission ${index} has valid refunded_amount`,
      commission.refunded_amount >= 0,
    );
  });

  // Step 4: Filter commissions by refund status - active (non-refunded) commissions
  const activeCommissions: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          is_refunded: false,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(activeCommissions);

  // Step 5: Validate all active commission records
  TestValidator.predicate(
    "active commissions data is array",
    Array.isArray(activeCommissions.data),
  );

  // Validate each active commission has is_refunded: false
  activeCommissions.data.forEach((commission, index) => {
    TestValidator.equals(
      `active commission ${index} has is_refunded false`,
      commission.is_refunded,
      false,
    );
  });

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "refunded commissions pagination is valid",
    refundedCommissions.pagination.current >= 1 &&
      refundedCommissions.pagination.records >= 0 &&
      refundedCommissions.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "active commissions pagination is valid",
    activeCommissions.pagination.current >= 1 &&
      activeCommissions.pagination.records >= 0 &&
      activeCommissions.pagination.pages >= 0,
  );
}
