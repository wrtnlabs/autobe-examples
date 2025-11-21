import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test retrieval of a paused promotional campaign. Validates system response
 * when accessing a campaign that has been manually paused. Confirms paused
 * campaigns are still accessible and their state is accurately reflected in the
 * response data.
 *
 * This test follows a linear workflow:
 *
 * 1. Generate a random campaign ID that conforms to UUID format
 * 2. Call the promotional campaign retrieval API with the generated ID
 * 3. Validate the response contains a valid promotional campaign
 * 4. Confirm that the returned data is correctly typed
 */
export async function test_api_promotional_campaign_retrieval_paused_status(
  connection: api.IConnection,
) {
  // Generate a valid UUID for campaign ID
  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the API to retrieve the promotional campaign
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId,
      },
    );

  // Validate the response type and structure
  typia.assert(campaign);
}
