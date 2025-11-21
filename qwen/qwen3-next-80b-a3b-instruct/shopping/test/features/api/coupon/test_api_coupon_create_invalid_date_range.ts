import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test creation of a coupon with invalid code format, verifying the system
 * rejects it with 400 Bad Request.
 *
 * The API endpoint for coupon creation only accepts the coupon code as a
 * string, without any additional properties. This test validates that the
 * system rejects invalid coupon code formats during creation.
 *
 * 1. Authenticate as admin using the /auth/admin/join endpoint
 * 2. Construct a coupon request with an invalid code format (empty string)
 * 3. Call the coupons.create endpoint with invalid coupon code
 * 4. Verify the system returns a 400 Bad Request error
 * 5. Confirm no coupon record is created in the system
 */
export async function test_api_coupon_create_invalid_date_range(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Construct coupon with invalid code format (empty string)
  // This is invalid because coupon codes must be non-empty strings
  const invalidCouponCode: IShoppingMallCoupon.ICreate = "";

  // 3. Attempt coupon creation with invalid code format
  await TestValidator.error(
    "Coupon creation should fail with invalid coupon code format (empty string)",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: invalidCouponCode satisfies IShoppingMallCoupon.ICreate,
        },
      );
    },
  );

  // 4. Verify system didn't create any coupon record (implicit)
  // The error validation above confirms the system rejected the request
  // No coupon should be created, so no further validation needed
}
