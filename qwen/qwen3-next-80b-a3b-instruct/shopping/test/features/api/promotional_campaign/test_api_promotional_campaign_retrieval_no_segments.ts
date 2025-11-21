import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_no_segments(
  connection: api.IConnection,
) {
  // Generate a random valid UUID for a promotional campaign
  const campaignId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the promotional campaign with no target segments
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId,
      },
    );

  // Validate the response type and structure
  typia.assert(campaign);

  // Confirm the campaign is retrieved successfully
  TestValidator.equals("campaign ID matches request", campaign, campaignId);
}
