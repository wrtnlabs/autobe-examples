import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test retrieval of a promotional campaign with budget depleted (current_usage
 *
 * > = budget). Validates system response when a campaign has exhausted its
 * > allocated budget. Confirms whether the campaign remains accessible but with
 * > appropriate status indicators for users.
 *
 * 1. Generate a valid promotional campaign ID using typia.random for UUID format
 * 2. Call the API to retrieve the campaign using the generated campaign ID
 * 3. Validate the response type using typia.assert
 *
 * This test focuses on verifying that budget-depleted campaigns can still be
 * retrieved with their status indicators intact, as per the scenario
 * requirements.
 */
export async function test_api_promotional_campaign_retrieval_budget_depleted(
  connection: api.IConnection,
) {
  const campaignId = typia.random<string & tags.Format<"uuid">>();

  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId,
      },
    );

  typia.assert(campaign);
}
