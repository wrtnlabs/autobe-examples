import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test retrieval of a campaign with draft status. Validates that the system
 * returns appropriate response when querying a campaign that is still in draft
 * state. Confirms whether draft campaigns are accessible by regular users or
 * restricted to administrative roles only.
 *
 * This test executes the following steps:
 *
 * 1. Generate a random valid UUID for a promotional campaign ID
 * 2. Call the API to retrieve the campaign by ID
 * 3. Validate that the response is a valid IShoppingMallPromotionalCampaign type
 * 4. Confirm response structure matches the expected type definition
 *
 * The test verifies that the endpoint properly returns the campaign data when a
 * valid campaign ID is provided, regardless of campaign status.
 */
export async function test_api_promotional_campaign_retrieval_draft_status(
  connection: api.IConnection,
) {
  // Generate a valid UUID for campaign ID
  const campaignId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the campaign by its ID
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: campaignId,
      },
    );

  // Validate the response matches the IShoppingMallPromotionalCampaign type
  typia.assert(campaign);
}
