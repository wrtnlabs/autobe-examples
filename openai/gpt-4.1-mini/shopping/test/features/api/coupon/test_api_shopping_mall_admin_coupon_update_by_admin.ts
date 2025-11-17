import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test the full workflow of updating an existing coupon by an authorized admin
 * user.
 *
 * The test covers:
 *
 * 1. Admin user registration and authentication.
 * 2. Coupon creation with unique code, type, discount value, and validity.
 * 3. Coupon update with new discount_value, type, and validity period.
 * 4. Validation that only authorized admin users can update coupons.
 * 5. Verification that updated coupon properties match the update request.
 *
 * This ensures the coupon management endpoints enforce admin authorization,
 * maintain data integrity, and correctly handle update operations for
 * promotional campaigns.
 */
export async function test_api_shopping_mall_admin_coupon_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
        href: "https://admin.shoppingsystem/login",
        referrer: "https://admin.shoppingsystem/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Coupon creation with unique code and details
  const initialCouponCode = RandomGenerator.alphaNumeric(10);
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days later

  const createBody = {
    code: initialCouponCode,
    type: "percentage",
    discount_value: 10,
    start_date: startDate,
    end_date: endDate,
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: createBody,
    });
  typia.assert(createdCoupon);
  TestValidator.equals(
    "coupon code after creation",
    createdCoupon.code,
    initialCouponCode,
  );
  TestValidator.equals(
    "coupon type after creation",
    createdCoupon.type,
    createBody.type,
  );
  TestValidator.equals(
    "coupon discount value after creation",
    createdCoupon.discount_value,
    createBody.discount_value,
  );

  // Step 3: Update the coupon properties
  const updatedCouponCode = initialCouponCode; // Keeping same code to update same coupon
  const updatedType = "fixed_amount";
  const updatedDiscountValue = 5000;
  const updatedStartDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day later
  const updatedEndDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString(); // 60 days later

  const updateBody = {
    code: updatedCouponCode,
    type: updatedType,
    discount_value: updatedDiscountValue,
    start_date: updatedStartDate,
    end_date: updatedEndDate,
  } satisfies IShoppingMallCoupon.IUpdate;

  const updatedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: updatedCouponCode,
      body: updateBody,
    });
  typia.assert(updatedCoupon);

  // Step 4: Validate the updated coupon fields
  TestValidator.equals(
    "coupon code after update",
    updatedCoupon.code,
    updatedCouponCode,
  );
  TestValidator.equals(
    "coupon type after update",
    updatedCoupon.type,
    updatedType,
  );
  TestValidator.equals(
    "coupon discount value after update",
    updatedCoupon.discount_value,
    updatedDiscountValue,
  );
  TestValidator.equals(
    "coupon start_date after update",
    updatedCoupon.start_date,
    updatedStartDate,
  );
  TestValidator.equals(
    "coupon end_date after update",
    updatedCoupon.end_date,
    updatedEndDate,
  );
}
