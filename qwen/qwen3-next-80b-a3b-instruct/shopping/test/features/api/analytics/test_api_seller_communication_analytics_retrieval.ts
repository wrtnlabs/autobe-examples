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
export async function test_api_seller_communication_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Retrieve communication analytics data
  const analyticsData: IPageIShoppingMallSellerCommunicationAnalytics.ISummary =
    await api.functional.shoppingMall.analytics.sellers.communication.index(
      adminConnection,
    );
  // Step 3: Validate the top-level structure
  typia.assert(analyticsData);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination has correct properties",
    typeof analyticsData.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current property",
    typeof analyticsData.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit property",
    typeof analyticsData.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records property",
    typeof analyticsData.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages property",
    typeof analyticsData.pagination.pages,
    "number",
  );
  // Step 5: Validate data array structure
  TestValidator.equals(
    "data is an array",
    Array.isArray(analyticsData.data),
    true,
  );
  TestValidator.predicate(
    "data array contains at least one element",
    analyticsData.data.length > 0,
  );
  // Step 6: Validate first data element structure
  const firstAnalyticsItem = analyticsData.data[0];
  typia.assert(firstAnalyticsItem);
  // Step 7: Validate all required numeric fields
  TestValidator.equals(
    "totalCommunications is a number",
    typeof firstAnalyticsItem.totalCommunications,
    "number",
  );
  TestValidator.equals(
    "averageResponseTimeHours is a number",
    typeof firstAnalyticsItem.averageResponseTimeHours,
    "number",
  );
  TestValidator.equals(
    "responseRatePercent is a number",
    typeof firstAnalyticsItem.responseRatePercent,
    "number",
  );
  TestValidator.equals(
    "communicationDiversityScore is a number",
    typeof firstAnalyticsItem.communicationDiversityScore,
    "number",
  );
  TestValidator.equals(
    "sellerEngagementIndex is a number",
    typeof firstAnalyticsItem.sellerEngagementIndex,
    "number",
  );
  TestValidator.equals(
    "highEngagementSellersCount is a number",
    typeof firstAnalyticsItem.highEngagementSellersCount,
    "number",
  );
  TestValidator.equals(
    "lowResponseSellersCount is a number",
    typeof firstAnalyticsItem.lowResponseSellersCount,
    "number",
  );
  TestValidator.equals(
    "satisfactionScore is a number",
    typeof firstAnalyticsItem.satisfactionScore,
    "number",
  );
  TestValidator.equals(
    "communicationResolutionRate is a number",
    typeof firstAnalyticsItem.communicationResolutionRate,
    "number",
  );
  // Step 8: Validate communicationVolumeByDay is array of numbers
  TestValidator.equals(
    "communicationVolumeByDay is array",
    Array.isArray(firstAnalyticsItem.communicationVolumeByDay),
    true,
  );
  TestValidator.equals(
    "communicationVolumeByDay has 30 elements",
    firstAnalyticsItem.communicationVolumeByDay.length,
    30,
  );
  TestValidator.predicate(
    "all communicationVolumeByDay elements are numbers",
    firstAnalyticsItem.communicationVolumeByDay.every(
      (v) => typeof v === "number",
    ),
  );
  // Step 9: Validate communicationChannelDistribution is an object
  TestValidator.equals(
    "communicationChannelDistribution is object",
    typeof firstAnalyticsItem.communicationChannelDistribution,
    "object",
  );
  TestValidator.equals(
    "communicationChannelDistribution is not null",
    firstAnalyticsItem.communicationChannelDistribution !== null,
    true,
  );
  // Step 10: Validate topPerformingSellers is array of objects
  TestValidator.equals(
    "topPerformingSellers is array",
    Array.isArray(firstAnalyticsItem.topPerformingSellers),
    true,
  );
  TestValidator.equals(
    "topPerformingSellers has 5 elements",
    firstAnalyticsItem.topPerformingSellers.length,
    5,
  );
  TestValidator.predicate(
    "all topPerformingSellers are objects",
    firstAnalyticsItem.topPerformingSellers.every(
      (s) => typeof s === "object" && s !== null,
    ),
  );
  // Step 11: Validate mostActiveCategories is array of objects
  TestValidator.equals(
    "mostActiveCategories is array",
    Array.isArray(firstAnalyticsItem.mostActiveCategories),
    true,
  );
  TestValidator.equals(
    "mostActiveCategories has 5 elements",
    firstAnalyticsItem.mostActiveCategories.length,
    5,
  );
  TestValidator.predicate(
    "all mostActiveCategories are objects",
    firstAnalyticsItem.mostActiveCategories.every(
      (c) => typeof c === "object" && c !== null,
    ),
  );
  // Step 12: Validate communicationGrowthTrend is a valid string enum
  TestValidator.predicate(
    "communicationGrowthTrend is valid enum value",
    ["increasing", "decreasing", "stable"].includes(
      firstAnalyticsItem.communicationGrowthTrend,
    ),
  );
  // Step 13: Validate responseTimeDistribution is an object
  TestValidator.equals(
    "responseTimeDistribution is object",
    typeof firstAnalyticsItem.responseTimeDistribution,
    "object",
  );
  TestValidator.equals(
    "responseTimeDistribution is not null",
    firstAnalyticsItem.responseTimeDistribution !== null,
    true,
  );
  // Step 14: Validate communicationLatencyPercentile is an object
  TestValidator.equals(
    "communicationLatencyPercentile is object",
    typeof firstAnalyticsItem.communicationLatencyPercentile,
    "object",
  );
  TestValidator.equals(
    "communicationLatencyPercentile is not null",
    firstAnalyticsItem.communicationLatencyPercentile !== null,
    true,
  );
  // Step 15: Validate communicationVolumeByChannel is an object
  TestValidator.equals(
    "communicationVolumeByChannel is object",
    typeof firstAnalyticsItem.communicationVolumeByChannel,
    "object",
  );
  TestValidator.equals(
    "communicationVolumeByChannel is not null",
    firstAnalyticsItem.communicationVolumeByChannel !== null,
    true,
  );
}
