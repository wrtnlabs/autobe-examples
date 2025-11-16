import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * This test validates the retrieval of detailed information about a specific
 * marketing coupon by its unique coupon code. It involves authenticating as an
 * admin, creating a coupon with realistic and valid properties, and then
 * retrieving the detailed coupon data. The test verifies that all coupon
 * properties, such as discount type, discount value, validity period, usage
 * limits, and status are correctly returned. It also tests authorization rules
 * and error handling for invalid coupon codes.
 */
export async function test_api_admin_coupon_detail_retrieval(
  connection: api.IConnection,
) {
  // Admin joins (authenticates) using a realistic admin creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "StrongPass1234!", // secure password
        phone_number: RandomGenerator.mobile(),
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create a marketing coupon with realistic valid data
  const couponCode: string = `COUPON-${RandomGenerator.alphabets(3).toUpperCase()}${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
  const nowIso = new Date().toISOString();
  const plusOneDayIso = new Date(Date.now() + 86400000).toISOString(); // 1 day later

  const couponCreateBody = {
    code: couponCode,
    description: "Test marketing coupon for e2e retrieval",
    discount_type: RandomGenerator.pick(["fixed", "percentage"] as const),
    discount_value: typia.random<number & tags.Minimum<0>>(),
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: nowIso,
    end_at: plusOneDayIso,
    usage_limit: null,
    per_customer_limit: null,
    status: "active",
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreateBody,
    });
  typia.assert(createdCoupon);

  // Retrieve coupon details by coupon code
  const retrievedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.at(connection, {
      couponCode: createdCoupon.code,
    });
  typia.assert(retrievedCoupon);

  // Assert all expected properties match
  TestValidator.equals(
    "coupon code matches",
    retrievedCoupon.code,
    createdCoupon.code,
  );
  TestValidator.equals(
    "coupon discount type matches",
    retrievedCoupon.discount_type,
    createdCoupon.discount_type,
  );
  TestValidator.equals(
    "coupon discount value matches",
    retrievedCoupon.discount_value,
    createdCoupon.discount_value,
  );
  TestValidator.equals(
    "coupon description matches",
    retrievedCoupon.description,
    createdCoupon.description,
  );
  TestValidator.equals(
    "coupon status matches",
    retrievedCoupon.status,
    "active",
  );

  // Check date intervals
  TestValidator.equals(
    "coupon start_at matches",
    retrievedCoupon.start_at,
    couponCreateBody.start_at,
  );

  TestValidator.equals(
    "coupon end_at matches",
    retrievedCoupon.end_at,
    couponCreateBody.end_at,
  );

  // For numeric nullable fields, assert null
  // They are null as set
  TestValidator.equals(
    "coupon minimum_order_amount is null",
    retrievedCoupon.minimum_order_amount,
    null,
  );
  TestValidator.equals(
    "coupon maximum_discount_amount is null",
    retrievedCoupon.maximum_discount_amount,
    null,
  );
  TestValidator.equals(
    "coupon usage_limit is null",
    retrievedCoupon.usage_limit,
    null,
  );
  TestValidator.equals(
    "coupon per_customer_limit is null",
    retrievedCoupon.per_customer_limit,
    null,
  );

  // Test error handling - invalid coupon code causes error
  await TestValidator.error(
    "error on retrieving non-existent coupon code",
    async () => {
      await api.functional.shoppingMall.admin.coupons.at(connection, {
        couponCode: "NON_EXISTENT_CODE",
      });
    },
  );
  // Test authorization error by using connection without admin
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.shoppingMall.admin.coupons.at(unauthConnection, {
      couponCode: createdCoupon.code,
    });
  });
}
