import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_expired_campaign(
  connection: api.IConnection,
) {
  // Generate a valid campaign ID using typia.random with uuid format
  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve the campaign using the API endpoint
  const retrievedCampaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: campaignId,
      },
    );

  // Validate that the retrieved campaign matches the generated ID
  typia.assert(retrievedCampaign);
  TestValidator.equals(
    "retrieved campaign ID matches requested ID",
    retrievedCampaign,
    campaignId,
  );
}
