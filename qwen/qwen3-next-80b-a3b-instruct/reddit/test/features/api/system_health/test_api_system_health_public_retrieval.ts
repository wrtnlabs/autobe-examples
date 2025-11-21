import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBBSSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSSystemHealth";

export async function test_api_system_health_public_retrieval(
  connection: api.IConnection,
) {
  const systemHealth: ICommunityBBSSystemHealth =
    await api.functional.communityBBS.dashboard.system_health.at(connection);
  typia.assert(systemHealth);

  // Validate moderation workload metrics
  TestValidator.predicate(
    "pendingReports should be non-negative",
    systemHealth.moderationWorkload.pendingReports >= 0,
  );
  TestValidator.predicate(
    "approvedReports should be non-negative",
    systemHealth.moderationWorkload.approvedReports >= 0,
  );
  TestValidator.predicate(
    "rejectedReports should be non-negative",
    systemHealth.moderationWorkload.rejectedReports >= 0,
  );
  TestValidator.predicate(
    "pendingContentDeletions should be non-negative",
    systemHealth.moderationWorkload.pendingContentDeletions >= 0,
  );
  TestValidator.predicate(
    "moderationReactionTime should be non-negative",
    systemHealth.moderationWorkload.moderationReactionTime >= 0,
  );

  // Validate content activity metrics
  TestValidator.predicate(
    "activePosts should be non-negative",
    systemHealth.contentActivity.activePosts >= 0,
  );
  TestValidator.predicate(
    "activeComments should be non-negative",
    systemHealth.contentActivity.activeComments >= 0,
  );
  TestValidator.predicate(
    "reportedContent should be non-negative",
    systemHealth.contentActivity.reportedContent >= 0,
  );
  TestValidator.predicate(
    "recentContentChanges should be non-negative",
    systemHealth.contentActivity.recentContentChanges >= 0,
  );

  // Validate system performance metrics
  TestValidator.predicate(
    "apiSuccessRate should be between 0 and 100",
    systemHealth.systemPerformance.apiSuccessRate >= 0 &&
      systemHealth.systemPerformance.apiSuccessRate <= 100,
  );
  TestValidator.predicate(
    "errorRate should be between 0 and 100",
    systemHealth.systemPerformance.errorRate >= 0 &&
      systemHealth.systemPerformance.errorRate <= 100,
  );
  TestValidator.predicate(
    "avgResponseTime should be non-negative",
    systemHealth.systemPerformance.avgResponseTime >= 0,
  );
  TestValidator.predicate(
    "cacheHitRate should be between 0 and 100",
    systemHealth.systemPerformance.cacheHitRate >= 0 &&
      systemHealth.systemPerformance.cacheHitRate <= 100,
  );

  // Validate infrastructure status (enum validation)
  TestValidator.predicate(
    "databaseConnectivity should be one of healthy, degraded, unavailable",
    systemHealth.infrastructureStatus.databaseConnectivity === "healthy" ||
      systemHealth.infrastructureStatus.databaseConnectivity === "degraded" ||
      systemHealth.infrastructureStatus.databaseConnectivity === "unavailable",
  );
  TestValidator.predicate(
    "cacheConnectivity should be one of healthy, degraded, unavailable",
    systemHealth.infrastructureStatus.cacheConnectivity === "healthy" ||
      systemHealth.infrastructureStatus.cacheConnectivity === "degraded" ||
      systemHealth.infrastructureStatus.cacheConnectivity === "unavailable",
  );
  TestValidator.predicate(
    "workerNodeStatus should be one of healthy, degraded, unavailable",
    systemHealth.infrastructureStatus.workerNodeStatus === "healthy" ||
      systemHealth.infrastructureStatus.workerNodeStatus === "degraded" ||
      systemHealth.infrastructureStatus.workerNodeStatus === "unavailable",
  );
  TestValidator.predicate(
    "externalServices should be one of healthy, degraded, unavailable",
    systemHealth.infrastructureStatus.externalServices === "healthy" ||
      systemHealth.infrastructureStatus.externalServices === "degraded" ||
      systemHealth.infrastructureStatus.externalServices === "unavailable",
  );

  // Validate overall health (enum validation)
  TestValidator.predicate(
    "overallHealth should be one of healthy, caution, critical",
    systemHealth.overallHealth === "healthy" ||
      systemHealth.overallHealth === "caution" ||
      systemHealth.overallHealth === "critical",
  );

  // Validate timestamp format
  TestValidator.predicate(
    "lastUpdated should be in date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      systemHealth.lastUpdated,
    ),
  );
  TestValidator.predicate(
    "estimatedRefreshTime should be in date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      systemHealth.estimatedRefreshTime,
    ),
  );
}
