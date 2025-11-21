import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_coupon_redemption_not_found_for_invalid_id(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to establish authorization context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a promotional campaign to establish valid context
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: "Campaign for holiday promotions" satisfies IShoppingMallPromotionalCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 3. Generate a universally unique identifier that will not exist
  const nonExistentRedemptionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Verify that attempting to retrieve a non-existent redemption ID returns 404 error
  await TestValidator.error(
    "GET request for non-existent coupon redemption should return 404 error",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupon_redemptions.at(
        connection,
        {
          redemptionId: nonExistentRedemptionId,
        },
      );
    },
  );
}
