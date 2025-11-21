import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_delete_blocked_by_redemptions(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to perform promotional operations
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a promotional campaign with invalid status (draft)
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: "Campaign for Summer Sale 2024" satisfies IShoppingMallPromotionalCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // Step 3: Generate multiple coupons from the campaign to create redemption dependencies
  const coupons: IShoppingMallCoupon[] = ArrayUtil.repeat(3, () => {
    return typia.random<IShoppingMallCoupon>() satisfies IShoppingMallCoupon.ICreate;
  });
  await ArrayUtil.asyncForEach(coupons, async (couponCode) => {
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  });

  // Step 4: Attempt to delete the campaign that has associated coupons
  await TestValidator.error(
    "deletion of campaign with redemptions should be blocked",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.erase(
        connection,
        {
          campaignId: campaign,
        },
      );
    },
  );
}
