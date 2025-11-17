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

export async function test_api_admin_coupon_usage_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin user authentication to obtain access token
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.portal/login",
    referrer: "https://admin.portal/",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Create a coupon usage record with valid coupon ID and timestamps
  // Use random but valid values for required properties
  const couponUsageCreateBody = {
    shopping_mall_coupon_id: typia.random<string & tags.Format<"uuid">>(),
    used_at: new Date().toISOString(),
    order_id: null,
  } satisfies IShoppingMallCouponUsage.ICreate;
  const createdCouponUsage: IShoppingMallCouponUsage =
    await api.functional.shoppingMall.admin.couponUsages.create(connection, {
      body: couponUsageCreateBody,
    });
  typia.assert(createdCouponUsage);

  // 3. Retrieve coupon usage detail by the id of coupon usage just created
  const retrievedCouponUsage: IShoppingMallCouponUsage =
    await api.functional.shoppingMall.admin.couponUsages.at(connection, {
      couponUsageId: createdCouponUsage.id,
    });
  typia.assert(retrievedCouponUsage);

  // 4. Validate that retrieved data matches the created record's id
  TestValidator.equals(
    "Retrieved couponUsage id matches created couponUsage id",
    retrievedCouponUsage.id,
    createdCouponUsage.id,
  );

  // 5. Validate linked objects exist and have expected id values
  TestValidator.equals(
    "Retrieved coupon id matches created coupon id",
    retrievedCouponUsage.shopping_mall_coupon.id,
    createdCouponUsage.shopping_mall_coupon.id,
  );
  TestValidator.equals(
    "Retrieved customer id matches created customer id",
    retrievedCouponUsage.shopping_mall_customer.id,
    createdCouponUsage.shopping_mall_customer.id,
  );
  TestValidator.equals(
    "Retrieved customer session id matches created customer session id",
    retrievedCouponUsage.shopping_mall_customer_session.id,
    createdCouponUsage.shopping_mall_customer_session.id,
  );
}
