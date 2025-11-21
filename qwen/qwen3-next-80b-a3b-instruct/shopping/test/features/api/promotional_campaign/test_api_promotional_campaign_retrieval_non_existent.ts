import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_non_existent(
  connection: api.IConnection,
) {
  // Generate a random UUID that does not exist in the system
  const nonExistentCampaignId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Test retrieval of a non-existent promotional campaign
  // Expected behavior: System returns 404 error
  await TestValidator.error(
    "should return 404 error for non-existent campaign",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: nonExistentCampaignId,
        },
      );
    },
  );
}
