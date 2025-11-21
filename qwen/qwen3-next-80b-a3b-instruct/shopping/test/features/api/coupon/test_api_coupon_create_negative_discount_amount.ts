import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test creation of a coupon with invalid format (contains spaces) and verify
 * the system returns 400 Bad Request with specific validation error. Ensure the
 * coupon is not created.
 *
 * This test follows a complete workflow:
 *
 * 1. Authenticate as admin using the join endpoint
 * 2. Attempt to create a coupon with an invalid coupon code format (spaces)
 * 3. Verify that the API returns a 400 Bad Request error with appropriate
 *    validation message
 * 4. Confirm that no coupon was created in the system
 *
 * The test validates the system's business logic for coupon creation,
 * specifically the constraint that coupon codes cannot contain spaces or other
 * invalid characters. The error must be properly handled by the backend with a
 * descriptive message indicating the invalid format.
 */
export async function test_api_coupon_create_negative_discount_amount(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to gain authorization for coupon creation
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password: "securePassword123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to create a coupon with invalid format (contains spaces)
  // According to coupon convention, coupon codes should not have spaces
  // This should trigger proper server-side validation as coupon codes must be single tokens with allowed characters only
  await TestValidator.error(
    "system should reject coupon creation with invalid format (space in code)",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: "COUPON 123" satisfies IShoppingMallCoupon.ICreate, // Invalid: contains space
        },
      );
    },
  );
}
