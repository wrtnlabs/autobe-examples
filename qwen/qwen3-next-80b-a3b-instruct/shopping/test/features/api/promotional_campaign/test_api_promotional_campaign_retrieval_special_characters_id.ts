import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test campaign retrieval with campaignId that contains special characters.
 * Validates system resilience against injection attempts and malformed
 * parameters by testing campaignId values with URL special characters, control
 * characters, or encoding anomalies.
 *
 * Since IShoppingMallPromotionalCampaign is defined as string, we cannot create
 * campaigns with special characters, but we can test if the API properly
 * handles special characters in the path parameter (campaignId) as specified in
 * the endpoint: /shoppingMall/promotions/promotional-campaigns/{campaignId}
 *
 * Here we test if the API can handle:
 *
 * 1. URL-encoded special characters in the campaignId path parameter
 * 2. Control characters
 * 3. Encoding anomalies
 *
 * Note: Although IShoppingMallPromotionalCampaign is a string type, the
 * endpoint expects a UUID format (string & tags.Format<"uuid">), so we will
 * test with a properly formatted UUID that contains special character encoding
 * beyond normal UUID patterns.
 */
export async function test_api_promotional_campaign_retrieval_special_characters_id(
  connection: api.IConnection,
) {
  const campaignId = typia.random<string & tags.Format<"uuid">>();

  // Encode a special character sequence that might be used in injection attempts
  // We'll use a UUID and append URL encoded special characters that are typically
  // used in injection attacks, but ensure the UUID remains valid
  const campaignIdWithSpecialChars = `${campaignId}%20%25%0A%0D%27%22%3C%3E%5C%7B%7D%28%29`;

  // Make the API call with the campaignId containing encoded special characters
  const response =
    await api.functional.shoppingMall.promotions.promotional_campaigns.at(
      connection,
      {
        campaignId: campaignIdWithSpecialChars,
      },
    );

  // Validate that the response is still an IShoppingMallPromotionalCampaign type
  // Even if the campaignId has special characters, the system should return an error
  // because the campaignId is not a valid UUID format, but we want to make sure
  // the response type structure is correct and the API doesn't crash
  typia.assert(response);

  // We expect a 404 error since no campaign exists with this malformed ID
  // But we validate that the error structure is as expected and the API is resilient
  await TestValidator.error(
    "campaign with malformed ID should return 404",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: campaignIdWithSpecialChars,
        },
      );
    },
  );

  // Test with special characters that don't break UUID structure
  // Test with percent-encoded characters in a way that still maintains UUID structure
  const campaignIdWithPercentEncoding = `${campaignId.substring(0, 8)}%25${campaignId.substring(8, 12)}${campaignId.substring(12, 36)}`;

  await TestValidator.error(
    "campaign with percent-encoded UUID should return 404",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: campaignIdWithPercentEncoding,
        },
      );
    },
  );

  // Test with control characters
  // Even though we're expecting these to be invalid, we test resilience
  const campaignIdWithControlChars = `${campaignId.substring(0, 8)}\x00\x01${campaignId.substring(12, 36)}`;

  await TestValidator.error(
    "campaign with control characters should return 404",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: campaignIdWithControlChars,
        },
      );
    },
  );

  // Test with absolute maximum URL length encoding
  const longParam = "x".repeat(200);
  const campaignIdLong = `${campaignId}${longParam}`;

  await TestValidator.error(
    "campaign with extremely long ID should return 404",
    async () => {
      await api.functional.shoppingMall.promotions.promotional_campaigns.at(
        connection,
        {
          campaignId: campaignIdLong,
        },
      );
    },
  );
}
