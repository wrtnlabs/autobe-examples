import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_empty_id(
  connection: api.IConnection,
) {
  // Test campaign retrieval with empty campaignId
  // Verify system returns error when campaignId path parameter is empty or invalid
  await TestValidator.error(
    "empty campaignId should return error",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: "", // Empty string as campaignId (invalid UUID format)
        },
      );
    },
  );

  // Test campaign retrieval with invalid non-UUID string
  await TestValidator.error(
    "invalid campaignId format should return error",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: "invalid-uuid-format", // Non-UUID string format
        },
      );
    },
  );

  // Test campaign retrieval with non-empty valid UUID string (positive case)
  // Verify an actual valid ID works to ensure our error tests aren't false positives
  const validCampaignId: string = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: validCampaignId,
      },
    );
  typia.assert(result);
}
