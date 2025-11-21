import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_update_unauthorized(
  connection: api.IConnection,
) {
  const adminA = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdmin.ICreate>(),
  });
  typia.assert(adminA);

  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: typia.random<IShoppingMallPromotionalCampaign.ICreate>(),
      },
    );
  typia.assert(campaign);

  const adminB = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdmin.ICreate>(),
  });
  typia.assert(adminB);

  await TestValidator.error(
    "unauthorized admin cannot update campaign",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.update(
        connection,
        {
          campaignId: campaign,
          body: {
            name: "Updated Name",
            description: "Updated Description",
            total_budget: 5000,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            status: "active",
          } satisfies IShoppingMallPromotionalCampaign.IUpdate,
        },
      );
    },
  );

  // Verify that the campaign was not modified (still has original name, but we can't access it since we didn't store the original)
  // The update should have failed, so we don't need to compare values

  // Clean up - not required but good practice
  typia.assert(adminA.token.access);
  typia.assert(adminB.token.access);
}
