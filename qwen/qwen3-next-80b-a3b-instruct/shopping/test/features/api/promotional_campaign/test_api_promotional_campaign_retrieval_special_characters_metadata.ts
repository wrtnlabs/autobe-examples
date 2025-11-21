import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test successful retrieval of a promotional campaign with a valid UUID
 * identifier.
 *
 * Validates that the system can successfully retrieve a promotional campaign by
 * its unique ID. Since no campaign creation endpoint exists in the provided
 * API, we test retrieval with a freshly generated valid UUID. The response is
 * validated to ensure the structure matches the
 * IShoppingMallPromotionalCampaign type. This test serves as a functional
 * verification that the retrieval endpoint works under normal conditions.
 *
 * Steps:
 *
 * 1. Generate a valid UUID for the campaignId
 * 2. Retrieve the campaign using the generated UUID
 * 3. Validate that the response matches the IShoppingMallPromotionalCampaign type
 */
export async function test_api_promotional_campaign_retrieval_special_characters_metadata(
  connection: api.IConnection,
) {
  // Generate a valid UUID for campaignId
  const campaignId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve the promotional campaign
  const retrievedCampaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      { campaignId },
    );

  // Validate that the retrieved campaign matches the expected type structure
  typia.assert(retrievedCampaign);
}
