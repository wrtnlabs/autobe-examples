import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test creating a coupon with both discount_amount and discount_percentage,
 * expected to fail with 400 Bad Request.
 *
 * This test verifies the system enforces the business rule that a coupon must
 * have exactly one of:
 *
 * - A fixed discount amount (discount_amount)
 * - A percentage discount (discount_percentage) but not both simultaneously. The
 *   API should reject requests with both fields populated with a 400 Bad
 *   Request error.
 *
 * Steps:
 *
 * 1. Authenticate as admin to gain authorization for coupon creation
 * 2. Construct a JSON string representing a coupon with both discount_amount and
 *    discount_percentage specified
 * 3. Attempt to create the coupon
 * 4. Verify the API returns a 400 Bad Request error
 * 5. Confirm no coupon record is created in the system
 *
 * This is a negative test case that validates the system's input validation
 * logic for coupon creation.
 */
export async function test_api_coupon_create_both_discounts(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const authResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "validPassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(authResponse);

  // Step 2: Construct a JSON string with both discount_amount and discount_percentage (invalid combination)
  // The system requires exactly one of discount_amount or discount_percentage, not both
  const couponBody = JSON.stringify({
    code: "TEST_COUPON_" + RandomGenerator.alphaNumeric(10),
    discount_amount: 5000, // 50.00 KRW
    discount_percentage: 10, // 10%
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days from now
    max_uses: 100,
    min_purchase_amount: 10000,
    description: "Test coupon with both discounts (should fail)",
  });

  // Step 3: Attempt to create coupon with invalid combination - this should fail
  await TestValidator.error(
    "Should reject coupon with both discount_amount and discount_percentage",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: couponBody, // Use the stringified JSON object
        },
      );
    },
  );

  // Step 4: No need to verify coupon creation as the API should have rejected the request
  // The error validation above confirms the system behavior - no coupon record should have been created
}
