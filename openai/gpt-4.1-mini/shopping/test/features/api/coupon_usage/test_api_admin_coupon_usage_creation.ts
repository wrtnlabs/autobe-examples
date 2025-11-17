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

export async function test_api_admin_coupon_usage_creation(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (join) to obtain authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        ip: null,
        href: "https://admin.shoppingmall.com/signup",
        referrer: "https://admin.shoppingmall.com/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Prepare creation data for coupon usage record
  // Generate a realistic used_at timestamp as current time
  const usedAt = new Date().toISOString();

  // Generate a coupon usage create request body
  const createRequestBody = {
    shopping_mall_coupon_id: typia.random<string & tags.Format<"uuid">>(),
    used_at: usedAt,
    order_id: null,
  } satisfies IShoppingMallCouponUsage.ICreate;

  // Step 3: Create coupon usage record by the admin
  const couponUsage: IShoppingMallCouponUsage =
    await api.functional.shoppingMall.admin.couponUsages.create(connection, {
      body: createRequestBody,
    });
  typia.assert(couponUsage);

  // Step 4: Validate the created coupon usage record
  TestValidator.equals(
    "couponUsage.coupon.id matches request ID",
    couponUsage.shopping_mall_coupon.id,
    createRequestBody.shopping_mall_coupon_id,
  );
  TestValidator.equals(
    "couponUsage.used_at matches usedAt",
    couponUsage.used_at,
    usedAt,
  );
  TestValidator.equals(
    "couponUsage.order_id is null as requested",
    couponUsage.order_id,
    null,
  );
}
