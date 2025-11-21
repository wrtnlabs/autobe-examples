import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_multiple_segments(
  connection: api.IConnection,
) {
  // Generate a valid UUID for campaignId
  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the API to retrieve the promotional campaign
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      { campaignId },
    );

  // Validate the response type using typia.assert for type safety
  typia.assert(campaign);
}
