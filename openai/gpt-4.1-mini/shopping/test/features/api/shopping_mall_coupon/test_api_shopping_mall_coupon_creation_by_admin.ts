import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_shopping_mall_coupon_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates using the join endpoint with valid admin creation data
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        phone_number: null,
        role: typia.random<"superadmin" | "admin" | "support">(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a new marketing coupon with realistic valid data
  // Start and end dates set to now and 7 days later
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Coupon usage limits, null or positive integers
  const usageLimit = RandomGenerator.pick([null, 100, 1000]) as number | null;
  const perCustomerLimit = RandomGenerator.pick([null, 1, 5]) as number | null;

  // Discount type fixed or percentage
  const discountType = RandomGenerator.pick(["fixed", "percentage"] as const);
  // Discount value zero or positive number
  const discountValue =
    discountType === "fixed"
      ? RandomGenerator.alphaNumeric(4).length * 100 // e.g. 100, 200
      : RandomGenerator.alphaNumeric(2).length * 10; // e.g. 10, 20

  const couponCode = `${discountType.toUpperCase().substring(0, 3)}-${new Date().getTime()}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  const createBody = {
    code: couponCode,
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    discount_type: discountType,
    discount_value: discountValue,
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: startAt,
    end_at: endAt,
    usage_limit: usageLimit,
    per_customer_limit: perCustomerLimit,
    status: "active",
  } satisfies IShoppingMallCoupon.ICreate;

  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: createBody,
    });

  typia.assert(coupon);

  // Validate that input and output fields match appropriately
  TestValidator.equals("coupon code matches", coupon.code, createBody.code);
  TestValidator.equals(
    "description matches",
    coupon.description,
    createBody.description,
  );
  TestValidator.equals(
    "discount type matches",
    coupon.discount_type,
    createBody.discount_type,
  );
  TestValidator.equals(
    "discount value matches",
    coupon.discount_value,
    createBody.discount_value,
  );
  TestValidator.equals(
    "minimum order amount matches",
    coupon.minimum_order_amount,
    createBody.minimum_order_amount,
  );
  TestValidator.equals(
    "maximum discount amount matches",
    coupon.maximum_discount_amount,
    createBody.maximum_discount_amount,
  );
  TestValidator.equals(
    "start time matches",
    coupon.start_at,
    createBody.start_at,
  );
  TestValidator.equals("end time matches", coupon.end_at, createBody.end_at);
  TestValidator.equals(
    "usage limit matches",
    coupon.usage_limit,
    createBody.usage_limit,
  );
  TestValidator.equals(
    "per customer limit matches",
    coupon.per_customer_limit,
    createBody.per_customer_limit,
  );
  TestValidator.equals("status matches", coupon.status, createBody.status);
}
