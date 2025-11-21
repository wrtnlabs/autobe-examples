import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_future_campaign(
  connection: api.IConnection,
) {
  // Generate a valid UUID for a future promotional campaign
  const futureCampaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve the future promotional campaign
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: futureCampaignId,
      },
    );

  // Validate the response type
  typia.assert(campaign);
}
