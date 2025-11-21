import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_success(
  connection: api.IConnection,
) {
  // Generate a valid UUID for promotional campaign ID
  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the API to retrieve the promotional campaign by ID
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: campaignId,
      },
    );

  // Validate that the response matches the expected IShoppingMallPromotionalCampaign type
  typia.assert(campaign);
}
