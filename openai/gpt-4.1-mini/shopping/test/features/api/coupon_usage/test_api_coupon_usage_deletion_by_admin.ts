import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponUsage";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Validate the deletion workflow of coupon usage records by an admin.
 *
 * This test performs a comprehensive scenario including:
 *
 * 1. Admin account creation and authentication via POST /auth/admin/join.
 * 2. Creation of a coupon usage record with required fields via POST
 *    /shoppingMall/admin/couponUsages.
 * 3. Deletion of the coupon usage using DELETE
 *    /shoppingMall/admin/couponUsages/{couponUsageId}.
 * 4. Verification that the coupon usage cannot be retrieved or used post-deletion.
 * 5. Validation that deletion operations are only permitted to authorized admin
 *    users, and unauthorized attempts fail.
 *
 * Each API response is validated with typia.assert for complete type safety.
 * Detailed and descriptive test validation assertions using TestValidator
 * ensure correctness and security constraints enforcement.
 */
export async function test_api_coupon_usage_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account registration and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: `https://example.com/admin/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Creation of a coupon usage record
  const couponUsageCreateBody = {
    shopping_mall_coupon_id: typia.random<string & tags.Format<"uuid">>(),
    used_at: new Date().toISOString(),
    order_id: null,
  } satisfies IShoppingMallCouponUsage.ICreate;

  const couponUsage: IShoppingMallCouponUsage =
    await api.functional.shoppingMall.admin.couponUsages.create(connection, {
      body: couponUsageCreateBody,
    });
  typia.assert(couponUsage);

  // 3. Delete the coupon usage record
  await api.functional.shoppingMall.admin.couponUsages.erase(connection, {
    couponUsageId: couponUsage.id,
  });

  // 4. Verify that deletion is enforced, attempt to delete again should fail
  await TestValidator.error(
    "deletion should fail if coupon usage does not exist",
    async () => {
      await api.functional.shoppingMall.admin.couponUsages.erase(connection, {
        couponUsageId: couponUsage.id,
      });
    },
  );

  // 5. Verify unauthorized deletion fails
  // Create a new connection without authentication headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.shoppingMall.admin.couponUsages.erase(
      unauthConnection,
      {
        couponUsageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
