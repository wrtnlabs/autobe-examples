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
export async function test_api_seller_communication_analytics_empty_data(
  connection: api.IConnection,
): Promise<void> {
  const result =
    await api.functional.shoppingMall.analytics.sellers.communication.index(
      connection,
    );
  typia.assert(result);
  // Verify pagination structure
  TestValidator.equals(
    "pagination current should be 0",
    result.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should be 100",
    result.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    result.pagination.pages,
    0,
  );
  // Verify all analytics metrics are initialized to zero or appropriate defaults
  // The 'data' property is an array, so we access the first element with data[0]
  const firstAnalytics = result.data[0];
  TestValidator.equals(
    "totalCommunications should be 0",
    firstAnalytics.totalCommunications,
    0,
  );
  TestValidator.equals(
    "averageResponseTimeHours should be 0",
    firstAnalytics.averageResponseTimeHours,
    0,
  );
  TestValidator.equals(
    "responseRatePercent should be 0",
    firstAnalytics.responseRatePercent,
    0,
  );
  TestValidator.equals(
    "communicationDiversityScore should be 0",
    firstAnalytics.communicationDiversityScore,
    0,
  );
  TestValidator.equals(
    "sellerEngagementIndex should be 0",
    firstAnalytics.sellerEngagementIndex,
    0,
  );
  TestValidator.equals(
    "highEngagementSellersCount should be 0",
    firstAnalytics.highEngagementSellersCount,
    0,
  );
  TestValidator.equals(
    "lowResponseSellersCount should be 0",
    firstAnalytics.lowResponseSellersCount,
    0,
  );
  // Verify communication volume by channel is an empty JSON string object
  TestValidator.equals(
    "communicationVolumeByChannel should be a valid empty object JSON string",
    firstAnalytics.communicationVolumeByChannel,
    "{}",
  );
  // Verify communication channel distribution is an empty JSON string object
  TestValidator.equals(
    "communicationChannelDistribution should be a valid empty object JSON string",
    firstAnalytics.communicationChannelDistribution,
    "{}",
  );
  // Verify top performing sellers is empty array
  TestValidator.equals(
    "topPerformingSellers should be empty array",
    firstAnalytics.topPerformingSellers.length,
    0,
  );
  // Verify most active categories is empty array
  TestValidator.equals(
    "mostActiveCategories should be empty array",
    firstAnalytics.mostActiveCategories.length,
    0,
  );
  // Verify communication volume by day has exactly 30 zeros
  TestValidator.equals(
    "communication volume by day length",
    firstAnalytics.communicationVolumeByDay.length,
    30,
  );
  for (let i = 0; i < 30; i++) {
    TestValidator.equals(
      `communicationVolumeByDay[${i}] should be 0`,
      firstAnalytics.communicationVolumeByDay[i],
      0,
    );
  }
  // Verify communication growth trend is stable
  TestValidator.equals(
    "communicationGrowthTrend should be stable",
    firstAnalytics.communicationGrowthTrend,
    "stable",
  );
  // Verify response time distribution is an empty JSON string object
  TestValidator.equals(
    "responseTimeDistribution should be a valid empty object JSON string",
    firstAnalytics.responseTimeDistribution,
    "{}",
  );
  // Verify latency percentiles are all initialized to 0
  TestValidator.equals(
    "p50 should be 0",
    firstAnalytics.communicationLatencyPercentile.p50,
    0,
  );
  TestValidator.equals(
    "p75 should be 0",
    firstAnalytics.communicationLatencyPercentile.p75,
    0,
  );
  TestValidator.equals(
    "p90 should be 0",
    firstAnalytics.communicationLatencyPercentile.p90,
    0,
  );
  TestValidator.equals(
    "p95 should be 0",
    firstAnalytics.communicationLatencyPercentile.p95,
    0,
  );
  // Verify satisfaction score is 0
  TestValidator.equals(
    "satisfactionScore should be 0",
    firstAnalytics.satisfactionScore,
    0,
  );
  // Verify communication resolution rate is 0
  TestValidator.equals(
    "communicationResolutionRate should be 0",
    firstAnalytics.communicationResolutionRate,
    0,
  );
}
