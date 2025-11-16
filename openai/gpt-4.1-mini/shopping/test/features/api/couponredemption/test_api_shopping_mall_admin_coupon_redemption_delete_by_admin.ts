import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * This test verifies the deletion of a coupon redemption by an admin user. The
 * test begins with authenticating an admin user using the join endpoint, which
 * requires registration with valid data including unique email, name, password,
 * optional phone number, and a valid role among 'superadmin', 'admin', or
 * 'support'. Once successfully authenticated, a marketing coupon is created
 * with all required properties such as a unique code, description,
 * discount_type (either 'fixed' or 'percentage'), discount_value
 * (non-negative), optional minimum_order_amount and maximum_discount_amount
 * (both nullable), start and end date-times, optional usage_limit and
 * per_customer_limit (nullable integers with minimum 1), and a valid status.
 * Upon successful creation of the coupon, the admin user deletes a specific
 * coupon redemption by providing the coupon code and redemption ID (both
 * strings). The test ensures token-based authorization is correctly handled
 * automatically by the SDK, and uses typia.assert to validate the received
 * authorization and coupon objects. It confirms the redemption deletion API
 * completes successfully without errors. All operations observe strict type
 * safety and correct data formats, including ISO 8601 for date-times and valid
 * email and UUID formats where relevant. The test mimics a real-world admin
 * workflow for managing coupons and their redemption records in the shopping
 * mall platform.
 */
export async function test_api_shopping_mall_admin_coupon_redemption_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user joins (authenticates) first
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreate: IShoppingMallAdmin.ICreate = {
    email: adminEmail,
    name: typia.random<string>(),
    password: "secureStrongPassword123!",
    phone_number: null,
    role: RandomGenerator.pick(["superadmin", "admin", "support"] as const),
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);

  // Step 2: Create a coupon necessary for redemption deletion
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // +30 days

  // Generate coupon code as uppercase alphanumeric string of length 8
  const couponCode = ArrayUtil.repeat(8, () =>
    RandomGenerator.pick([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"]),
  ).join("");

  // Generate discount value realistically, e.g., integer between 1 and 100
  const discountValue = Math.floor(Math.random() * 100) + 1; // random integer 1-100 inclusive

  const couponCreate: IShoppingMallCoupon.ICreate = {
    code: couponCode,
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: RandomGenerator.pick(["fixed", "percentage"] as const),
    discount_value: discountValue,
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: startAt,
    end_at: endAt,
    usage_limit: null,
    per_customer_limit: null,
    status: "active",
  };

  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreate,
    });
  typia.assert(coupon);

  // Step 3: Delete a coupon redemption by coupon code and redemption ID
  // Redemption ID will be a random UUID for testing
  const redemptionId = typia.random<string & tags.Format<"uuid">>();

  // Execute deletion
  await api.functional.shoppingMall.admin.coupons.redemptions.erase(
    connection,
    {
      couponCode: coupon.code,
      redemptionId: redemptionId,
    },
  );
}
