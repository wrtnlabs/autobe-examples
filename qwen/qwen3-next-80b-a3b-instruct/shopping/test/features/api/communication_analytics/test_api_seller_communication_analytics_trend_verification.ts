import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunicationChannelDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunicationChannelDistribution";
import type { ICommunicationLatencyPercentile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunicationLatencyPercentile";
import type { ICommunicationVolumeByChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunicationVolumeByChannel";
import type { IMostActiveCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMostActiveCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerCommunicationAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerCommunicationAnalytics";
import type { IResponseTimeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IResponseTimeDistribution";
import type { IShoppingMallSellerCommunicationAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationAnalytics";
import type { ITopPerformingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/ITopPerformingSeller";
export async function test_api_seller_communication_analytics_trend_verification(
  connection: api.IConnection,
): Promise<void> {
  const response: IPageIShoppingMallSellerCommunicationAnalytics.ISummary =
    await api.functional.shoppingMall.analytics.sellers.communication.index(
      connection,
    );
  typia.assert(response);
  // Validate communication volume by day - must be exactly 30 days
  const communicationVolumeByDay = response.data[0].communicationVolumeByDay;
  TestValidator.equals(
    "communicationVolumeByDay has exactly 30 days",
    communicationVolumeByDay.length,
    30,
  );
  // Validate growth trend - must be 'increasing' based on ascending pattern
  // Since we need to check for an increasing trend, the last value should be higher than the first
  const firstDayValue = communicationVolumeByDay[0];
  const lastDayValue = communicationVolumeByDay[29];
  TestValidator.predicate(
    "growth trend is increasing",
    lastDayValue > firstDayValue,
  );
  // Validate communicationGrowthTrend field is 'increasing'
  TestValidator.equals(
    "communicationGrowthTrend is increasing",
    response.data[0].communicationGrowthTrend,
    "increasing",
  );
  // Validate communicationVolumeByChannel is an object with string keys and number values
  const communicationVolumeByChannel =
    response.data[0].communicationVolumeByChannel;
  TestValidator.predicate(
    "communicationVolumeByChannel is object",
    communicationVolumeByChannel !== null &&
      typeof communicationVolumeByChannel === "object",
  );
  // Check all keys and values in communicationVolumeByChannel
  for (const [key, value] of Object.entries(communicationVolumeByChannel)) {
    TestValidator.predicate(
      "communicationVolumeByChannel key is string",
      typeof key === "string",
    );
    TestValidator.predicate(
      "communicationVolumeByChannel value is number",
      typeof value === "number" && value >= 0,
    );
  }
  // Validate communicationChannelDistribution is an object with string keys and number values
  const communicationChannelDistribution =
    response.data[0].communicationChannelDistribution;
  TestValidator.predicate(
    "communicationChannelDistribution is object",
    communicationChannelDistribution !== null &&
      typeof communicationChannelDistribution === "object",
  );
  // Check all keys and values in communicationChannelDistribution and verify sum is approximately 100 (accounting for floating point precision)
  let totalPercentage = 0;
  for (const [key, value] of Object.entries(communicationChannelDistribution)) {
    TestValidator.predicate(
      "communicationChannelDistribution key is string",
      typeof key === "string",
    );
    TestValidator.predicate(
      "communicationChannelDistribution value is number",
      typeof value === "number" && value >= 0,
    );
    totalPercentage += Number(value); // Fixed: Cast string to number before addition
  }
  // Allow small floating point precision error
  TestValidator.predicate(
    "communicationChannelDistribution percentages sum to approximately 100",
    Math.abs(totalPercentage - 100) < 0.01,
  );
  // Validate other required fields
  TestValidator.predicate(
    "totalCommunications is number",
    typeof response.data[0].totalCommunications === "number" &&
      Number.isInteger(response.data[0].totalCommunications),
  );
  TestValidator.predicate(
    "averageResponseTimeHours is number",
    typeof response.data[0].averageResponseTimeHours === "number" &&
      response.data[0].averageResponseTimeHours >= 0,
  );
  TestValidator.predicate(
    "responseRatePercent is number",
    typeof response.data[0].responseRatePercent === "number" &&
      response.data[0].responseRatePercent >= 0 &&
      response.data[0].responseRatePercent <= 100,
  );
  TestValidator.predicate(
    "communicationDiversityScore is number",
    typeof response.data[0].communicationDiversityScore === "number" &&
      response.data[0].communicationDiversityScore >= 0 &&
      response.data[0].communicationDiversityScore <= 1,
  );
  TestValidator.predicate(
    "sellerEngagementIndex is number",
    typeof response.data[0].sellerEngagementIndex === "number" &&
      response.data[0].sellerEngagementIndex >= 0 &&
      response.data[0].sellerEngagementIndex <= 100,
  );
  TestValidator.predicate(
    "highEngagementSellersCount is number",
    typeof response.data[0].highEngagementSellersCount === "number" &&
      Number.isInteger(response.data[0].highEngagementSellersCount) &&
      response.data[0].highEngagementSellersCount >= 0,
  );
  TestValidator.predicate(
    "lowResponseSellersCount is number",
    typeof response.data[0].lowResponseSellersCount === "number" &&
      Number.isInteger(response.data[0].lowResponseSellersCount) &&
      response.data[0].lowResponseSellersCount >= 0,
  );
  TestValidator.predicate(
    "topPerformingSellers has 5 items",
    Array.isArray(response.data[0].topPerformingSellers) &&
      response.data[0].topPerformingSellers.length === 5,
  );
  TestValidator.predicate(
    "mostActiveCategories has 5 items",
    Array.isArray(response.data[0].mostActiveCategories) &&
      response.data[0].mostActiveCategories.length === 5,
  );
  TestValidator.predicate(
    "responseTimeDistribution is object",
    typeof response.data[0].responseTimeDistribution === "object" &&
      response.data[0].responseTimeDistribution !== null,
  );
  TestValidator.predicate(
    "communicationLatencyPercentile is object",
    typeof response.data[0].communicationLatencyPercentile === "object" &&
      response.data[0].communicationLatencyPercentile !== null,
  );
  TestValidator.predicate(
    "satisfactionScore is number",
    typeof response.data[0].satisfactionScore === "number" &&
      response.data[0].satisfactionScore >= 0 &&
      response.data[0].satisfactionScore <= 10,
  );
  TestValidator.predicate(
    "communicationResolutionRate is number",
    typeof response.data[0].communicationResolutionRate === "number" &&
      response.data[0].communicationResolutionRate >= 0 &&
      response.data[0].communicationResolutionRate <= 100,
  );
}