import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_draft_to_active(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminCredentials: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "full_admin" as const,
  };
  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(authenticatedAdmin);

  // 2. Create a draft promotional campaign
  const promotionalCampaignCreate: IShoppingMallPromotionalCampaign.ICreate =
    typia.random<IShoppingMallPromotionalCampaign.ICreate>();
  const createdCampaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: promotionalCampaignCreate,
      },
    );
  typia.assert(createdCampaign);

  // 3. Update the campaign from draft to active status
  const campaignId: string = createdCampaign as string;
  const updatedCampaignData: IShoppingMallPromotionalCampaign.IUpdate = {
    name: "Updated Promotional Campaign",
    description: "Description for the active promotional campaign",
    total_budget: 50000,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    status: "active", // Transition from draft to active
  };
  const updatedCampaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.update(
      connection,
      {
        campaignId,
        body: updatedCampaignData,
      },
    );
  typia.assert(updatedCampaign);
}
