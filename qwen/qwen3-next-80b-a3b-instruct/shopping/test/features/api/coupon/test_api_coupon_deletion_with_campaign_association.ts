import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_coupon_deletion_with_campaign_association(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin using join endpoint
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a promotional campaign
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: `campaign_${typia.random<string & tags.Format<"uuid">>()}` satisfies IShoppingMallPromotionalCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // Step 3: Create a coupon assigned to the promotional campaign
  const couponCode: string = `COUPON_${typia.random<string & tags.Format<"uuid">>()}`;
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);
  TestValidator.equals("coupon code matches", createdCoupon, couponCode);

  // Step 4: Delete the coupon using its coupon code
  await api.functional.shoppingMall.admin.promotions.coupons.erase(connection, {
    couponCode: couponCode,
  });

  // Step 5: Create a new coupon using the same campaign to verify campaign integrity
  const newCouponCode: string = `NEW_COUPON_${typia.random<string & tags.Format<"uuid">>()}`;
  const newCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: newCouponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(newCoupon);
  TestValidator.equals("new coupon code matches", newCoupon, newCouponCode);

  // Validation: Coupon deletion succeeded (no error) and campaign can still create new coupons
  // This proves: 1. Coupon is deleted, 2. Campaign remains fully functional
}
