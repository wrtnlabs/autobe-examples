import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_retrieval_malformed_uuid(
  connection: api.IConnection,
) {
  await TestValidator.error("malformed UUID should fail", async () => {
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: "invalid-uuid-format",
      },
    );
  });
}
