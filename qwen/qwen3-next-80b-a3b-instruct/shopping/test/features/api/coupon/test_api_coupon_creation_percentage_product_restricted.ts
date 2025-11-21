import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_creation_percentage_product_restricted(
  connection: api.IConnection,
) {
  // Create a new admin account to authenticate and create coupon
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "full_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Generate unique coupon code and product ID for restriction
  const couponCode = RandomGenerator.alphaNumeric(15);
  const productId = typia.random<string & tags.Format<"uuid">>();

  // Prepare coupon creation data with percentage discount and product restriction
  // IShoppingMallCoupon.ICreate is a string type containing JSON-encoded coupon configuration
  const couponData: IShoppingMallCoupon.ICreate = JSON.stringify({
    code: couponCode,
    discount_percentage: 15,
    discount_amount: null,
    validity_days: 60,
    usage_limit: null,
    applicable_to_products: [productId],
    applicable_to_categories: [],
    campaign_id: null,
  });

  // Create the coupon using the admin-authenticated connection
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponData,
      },
    );
  typia.assert(createdCoupon);

  // Validate that the created coupon code matches the input
  TestValidator.equals(
    "created coupon code matches input",
    createdCoupon,
    couponCode,
  );

  // Validate the coupon structure by parsing the JSON string response
  const parsedCoupon = JSON.parse(createdCoupon as string);
  TestValidator.equals(
    "discount percentage is 15",
    parsedCoupon.discount_percentage,
    15,
  );
  TestValidator.equals(
    "discount amount is null",
    parsedCoupon.discount_amount,
    null,
  );
  TestValidator.equals("validity days is 60", parsedCoupon.validity_days, 60);
  TestValidator.equals("usage limit is null", parsedCoupon.usage_limit, null);
  TestValidator.equals(
    "applicable to products contains product ID",
    parsedCoupon.applicable_to_products,
    [productId],
  );
  TestValidator.equals(
    "applicable to categories is empty array",
    parsedCoupon.applicable_to_categories,
    [],
  );
  TestValidator.equals("campaign ID is null", parsedCoupon.campaign_id, null);
}
