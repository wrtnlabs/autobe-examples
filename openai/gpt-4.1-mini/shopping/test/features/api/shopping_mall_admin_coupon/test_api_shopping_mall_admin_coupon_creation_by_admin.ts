import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_shopping_mall_admin_coupon_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joining to authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a unique coupon
  const couponCode = `${RandomGenerator.alphaNumeric(4).toUpperCase()}${typia.random<string & tags.Pattern<"^[0-9]{4}$">>()}`;
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days

  const couponCreateBody = {
    code: couponCode,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    discount_type: RandomGenerator.pick(["fixed", "percentage"] as const),
    discount_value: RandomGenerator.alphaNumeric(2).length * 5 + 10, // simple value >=0
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: startAt,
    end_at: endAt,
    usage_limit: null,
    per_customer_limit: null,
    status: "active",
  } satisfies IShoppingMallCoupon.ICreate;

  const couponCreated: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreateBody,
    });
  typia.assert(couponCreated);

  // 3. Validate returned coupon matches input fields
  TestValidator.equals(
    "coupon code",
    couponCreated.code,
    couponCreateBody.code,
  );
  TestValidator.equals(
    "coupon description",
    couponCreated.description,
    couponCreateBody.description,
  );
  TestValidator.equals(
    "discount type",
    couponCreated.discount_type,
    couponCreateBody.discount_type,
  );
  TestValidator.equals(
    "discount value",
    couponCreated.discount_value,
    couponCreateBody.discount_value,
  );
  TestValidator.equals(
    "minimum order amount",
    couponCreated.minimum_order_amount,
    couponCreateBody.minimum_order_amount,
  );
  TestValidator.equals(
    "maximum discount amount",
    couponCreated.maximum_discount_amount,
    couponCreateBody.maximum_discount_amount,
  );
  TestValidator.equals(
    "start at",
    couponCreated.start_at,
    couponCreateBody.start_at,
  );
  TestValidator.equals("end at", couponCreated.end_at, couponCreateBody.end_at);
  TestValidator.equals(
    "usage limit",
    couponCreated.usage_limit,
    couponCreateBody.usage_limit,
  );
  TestValidator.equals(
    "per customer limit",
    couponCreated.per_customer_limit,
    couponCreateBody.per_customer_limit,
  );
  TestValidator.equals("status", couponCreated.status, couponCreateBody.status);

  // 4. Try to create another coupon with same code to test uniqueness enforcement
  await TestValidator.error(
    "duplicate coupon code creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.coupons.create(connection, {
        body: {
          ...couponCreateBody,
          description: RandomGenerator.paragraph({ sentences: 3 }), // Different description
        },
      });
    },
  );
}
