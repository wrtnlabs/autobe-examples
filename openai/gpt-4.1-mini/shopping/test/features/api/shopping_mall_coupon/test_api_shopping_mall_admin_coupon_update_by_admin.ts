import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_shopping_mall_admin_coupon_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminName = RandomGenerator.name();
  const adminRole: IShoppingMallAdmin.ICreate["role"] = "admin";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new coupon to be updated
  const couponCode = `TEST-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const initialCouponCreate = {
    code: couponCode,
    description: "Initial test coupon",
    discount_type: "percentage" as const,
    discount_value: 15,
    minimum_order_amount: 5000,
    maximum_discount_amount: 2000,
    start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days from now
    usage_limit: 1000,
    per_customer_limit: 2,
    status: "active",
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: initialCouponCreate,
    });
  typia.assert(createdCoupon);
  TestValidator.equals("coupon code matches", createdCoupon.code, couponCode);

  // Step 3: Update the coupon by changing discount, dates, usage limits, description, and status
  const updatePayload = {
    discount_type: "fixed" as const, // changing discount type
    discount_value: 1000, // fixed amount
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: null,
    end_at: null,
    usage_limit: 500,
    per_customer_limit: 1,
    status: "disabled",
    description: "Updated coupon with fixed discount and limits",
  } satisfies IShoppingMallCoupon.IUpdate;

  const updatedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: couponCode,
      body: updatePayload,
    });
  typia.assert(updatedCoupon);

  // Validate that updates were applied correctly
  TestValidator.equals(
    "updated discount type",
    updatedCoupon.discount_type,
    "fixed",
  );
  TestValidator.equals(
    "updated discount value",
    updatedCoupon.discount_value,
    1000,
  );
  TestValidator.equals(
    "nullable minimum order amount",
    updatedCoupon.minimum_order_amount,
    null,
  );
  TestValidator.equals(
    "nullable maximum discount amount",
    updatedCoupon.maximum_discount_amount,
    null,
  );
  TestValidator.equals("nullable start_at", updatedCoupon.start_at, null);
  TestValidator.equals("nullable end_at", updatedCoupon.end_at, null);
  TestValidator.equals("updated usage limit", updatedCoupon.usage_limit, 500);
  TestValidator.equals(
    "updated per customer limit",
    updatedCoupon.per_customer_limit,
    1,
  );
  TestValidator.equals(
    "updated description",
    updatedCoupon.description,
    "Updated coupon with fixed discount and limits",
  );
  TestValidator.equals("updated status", updatedCoupon.status, "disabled");
}
