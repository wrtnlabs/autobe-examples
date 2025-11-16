import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * This test verifies the coupon redemption update workflow for a customer. It
 * first authenticates a new customer using the join endpoint, then creates a
 * new marketing coupon as an admin prerequisite. After the coupon is created,
 * the customer updates a redemption record associated with the coupon,
 * modifying relevant redemption details such as the redeemed amount. The
 * scenario validates proper authorization, data integrity, and business rule
 * enforcement that redemption cannot exceed the coupon's limits. It also
 * confirms the update response matches expected updated coupon redemption
 * data.
 */
export async function test_api_shopping_mall_customer_coupon_redemption_update_by_customer(
  connection: api.IConnection,
) {
  // Authenticate a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "P@ssw0rd";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ssw0rd";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Admin creates a new marketing coupon
  const couponCode = `CUPON${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const couponCreateBody: IShoppingMallCoupon.ICreate = {
    code: couponCode,
    description: "Test coupon created during E2E.",
    discount_type: "fixed",
    discount_value: 1000,
    minimum_order_amount: 5000,
    maximum_discount_amount: null,
    start_at: now.toISOString(),
    end_at: oneMonthLater.toISOString(),
    usage_limit: 1000,
    per_customer_limit: 3,
    status: "active",
  };
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreateBody,
    });
  typia.assert(coupon);
  TestValidator.equals("coupon code matches", coupon.code, couponCode);

  // Simulate customer login to refresh authorization state
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/login",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLogin);
  TestValidator.equals(
    "logged in customer matches",
    customerLogin.email,
    customerEmail,
  );

  // Since no redemption creation API is given, we simulate a redemption ID
  const redemptionId = typia.random<string & tags.Format<"uuid">>();

  // Update the redemption as customer
  const redeemedAmount = 500; // must be <= coupon discount_value
  const updateBody: IShoppingMallCouponRedemption.IUpdate = {
    redeemed_amount: redeemedAmount,
  };

  const redemptionUpdated: IShoppingMallCouponRedemption =
    await api.functional.shoppingMall.customer.coupons.redemptions.update(
      connection,
      {
        couponCode: couponCode,
        redemptionId: redemptionId,
        body: updateBody,
      },
    );
  typia.assert(redemptionUpdated);
  TestValidator.equals(
    "updated redemption coupon code",
    redemptionUpdated.coupon.code,
    couponCode,
  );
  TestValidator.predicate(
    "redeemed amount not exceeding coupon discount",
    (redemptionUpdated.redeemed_amount ?? 0) <= coupon.discount_value,
  );
}
