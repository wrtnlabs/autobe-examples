import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_admin_coupon_creation(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword!23";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create coupon
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(
    now.getTime() + 15 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const newCouponCode = `PROMO${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  const couponCreate: IShoppingMallCoupon.ICreate = {
    code: newCouponCode,
    description: "Seasonal promotion discount coupon",
    discount_type: "fixed",
    discount_value: 5000,
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: startAt,
    end_at: endAt,
    usage_limit: 500,
    per_customer_limit: 3,
    status: "active",
  };

  const createdCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: couponCreate,
    },
  );
  typia.assert(createdCoupon);

  // Step 3: Assert created coupon matches requested values
  TestValidator.equals(
    "coupon code matches",
    createdCoupon.code,
    couponCreate.code,
  );
  TestValidator.equals(
    "description matches",
    createdCoupon.description,
    couponCreate.description,
  );
  TestValidator.equals(
    "discount type matches",
    createdCoupon.discount_type,
    couponCreate.discount_type,
  );
  TestValidator.equals(
    "discount value matches",
    createdCoupon.discount_value,
    couponCreate.discount_value,
  );
  TestValidator.equals(
    "minimum order amount matches",
    createdCoupon.minimum_order_amount,
    couponCreate.minimum_order_amount,
  );
  TestValidator.equals(
    "maximum discount amount matches",
    createdCoupon.maximum_discount_amount,
    couponCreate.maximum_discount_amount,
  );
  TestValidator.equals(
    "start date matches",
    createdCoupon.start_at,
    couponCreate.start_at,
  );
  TestValidator.equals(
    "end date matches",
    createdCoupon.end_at,
    couponCreate.end_at,
  );
  TestValidator.equals(
    "usage limit matches",
    createdCoupon.usage_limit,
    couponCreate.usage_limit,
  );
  TestValidator.equals(
    "per customer limit matches",
    createdCoupon.per_customer_limit,
    couponCreate.per_customer_limit,
  );
  TestValidator.equals(
    "status matches",
    createdCoupon.status,
    couponCreate.status,
  );
}
