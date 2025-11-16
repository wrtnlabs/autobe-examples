import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAnalyticsOutcomes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsOutcomes";

export async function test_api_moderation_outcomes_analytics_action_type_filtering(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain authorized context and JWT
  const joinRequestBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // 2. Prepare a wide time range around "now" for analytics queries
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future

  const createdAtFrom = from.toISOString();
  const createdAtTo = to.toISOString();

  // 3. Baseline analytics without actionTypes filter (platform-wide)
  const baseline: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          timezone: "UTC",
        } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest,
      },
    );
  typia.assert(baseline);

  // Sanity check: numeric counters should be non-negative
  TestValidator.predicate(
    "baseline totalActionsCount non-negative",
    () => baseline.totalActionsCount >= 0,
  );
  TestValidator.predicate(
    "baseline contentRemovalCount non-negative",
    () => baseline.contentRemovalCount >= 0,
  );
  TestValidator.predicate(
    "baseline communityRestrictionCount non-negative",
    () => baseline.communityRestrictionCount >= 0,
  );
  TestValidator.predicate(
    "baseline userSuspensionCount non-negative",
    () => baseline.userSuspensionCount >= 0,
  );
  TestValidator.predicate(
    "baseline warningOnlyCount non-negative",
    () => baseline.warningOnlyCount >= 0,
  );
  TestValidator.predicate(
    "baseline noActionCount non-negative",
    () => baseline.noActionCount >= 0,
  );
  TestValidator.predicate(
    "baseline caseResolutionRate within [0,1]",
    () => baseline.caseResolutionRate >= 0 && baseline.caseResolutionRate <= 1,
  );

  // Helper to sum counts in actionsByType
  const sumActionsByType = (
    actions:
      | ICommunityPlatformModerationAnalyticsOutcomes["actionsByType"]
      | ICommunityPlatformModerationAnalyticsOutcomes.IActionsByTypeBucket[],
  ): number => actions.reduce((acc, bucket) => acc + bucket.count, 0);

  const baselineTypeSum = sumActionsByType(baseline.actionsByType);
  TestValidator.predicate(
    "baseline actionsByType sum does not exceed totalActionsCount",
    () => baselineTypeSum <= baseline.totalActionsCount,
  );

  // 4. Filtered analytics for a single action type: "content_removal"
  const contentRemovalType = "content_removal";

  const contentRemovalOnly: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          timezone: "UTC",
          actionTypes: [contentRemovalType],
        } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest,
      },
    );
  typia.assert(contentRemovalOnly);

  // Basic monotonicity checks: filtering cannot increase totals
  TestValidator.predicate(
    "content-removal-only totalActionsCount <= baseline",
    () => contentRemovalOnly.totalActionsCount <= baseline.totalActionsCount,
  );
  TestValidator.predicate(
    "content-removal-only contentRemovalCount <= baseline",
    () =>
      contentRemovalOnly.contentRemovalCount <= baseline.contentRemovalCount,
  );
  TestValidator.predicate(
    "content-removal-only userSuspensionCount <= baseline",
    () =>
      contentRemovalOnly.userSuspensionCount <= baseline.userSuspensionCount,
  );
  TestValidator.predicate(
    "content-removal-only warningOnlyCount <= baseline",
    () => contentRemovalOnly.warningOnlyCount <= baseline.warningOnlyCount,
  );
  TestValidator.predicate(
    "content-removal-only communityRestrictionCount <= baseline",
    () =>
      contentRemovalOnly.communityRestrictionCount <=
      baseline.communityRestrictionCount,
  );
  TestValidator.predicate(
    "content-removal-only noActionCount <= baseline",
    () => contentRemovalOnly.noActionCount <= baseline.noActionCount,
  );

  const contentRemovalTypeSum = sumActionsByType(
    contentRemovalOnly.actionsByType,
  );
  TestValidator.predicate(
    "content-removal-only actionsByType sum does not exceed totalActionsCount",
    () => contentRemovalTypeSum <= contentRemovalOnly.totalActionsCount,
  );

  // 4-1. Validate actionsByType buckets obey the actionTypes filter:
  // - Only buckets with actionType === "content_removal" may have non-zero count.
  for (const bucket of contentRemovalOnly.actionsByType) {
    if (bucket.actionType === contentRemovalType) continue;
    TestValidator.predicate(
      "non-requested actionType bucket must have zero count when filtered by content_removal",
      () => bucket.count === 0,
    );
  }

  // 4-2. If baseline has a content_removal bucket, filtered bucket count must
  // not exceed the baseline bucket count.
  const baselineContentRemovalBucket = baseline.actionsByType.find(
    (b) => b.actionType === contentRemovalType,
  );
  const filteredContentRemovalBucket = contentRemovalOnly.actionsByType.find(
    (b) => b.actionType === contentRemovalType,
  );

  if (baselineContentRemovalBucket !== undefined) {
    if (filteredContentRemovalBucket !== undefined) {
      TestValidator.predicate(
        "filtered content_removal bucket count <= baseline bucket count",
        () =>
          filteredContentRemovalBucket.count <=
          baselineContentRemovalBucket.count,
      );
    } else {
      // If baseline has the bucket but filtered does not, it implies zero
      // count under filter. We only require that baseline's count is >= 0,
      // which is already enforced, so nothing more to assert.
    }
  } else {
    // If baseline has no such bucket, filtered must also not report any
    // positive counts for content_removal.
    if (filteredContentRemovalBucket !== undefined) {
      TestValidator.predicate(
        "when baseline has no content_removal bucket, filtered content_removal bucket must have zero count",
        () => filteredContentRemovalBucket.count === 0,
      );
    }
  }

  // 5. Multi-type filter: ["content_removal", "user_suspension"]
  const userSuspensionType = "user_suspension";

  const contentAndSuspension: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          timezone: "UTC",
          actionTypes: [contentRemovalType, userSuspensionType],
        } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest,
      },
    );
  typia.assert(contentAndSuspension);

  const contentAndSuspensionTypeSum = sumActionsByType(
    contentAndSuspension.actionsByType,
  );
  TestValidator.predicate(
    "content+userSuspension actionsByType sum does not exceed totalActionsCount",
    () => contentAndSuspensionTypeSum <= contentAndSuspension.totalActionsCount,
  );

  // Monotonicity of total actions across scenarios
  TestValidator.predicate(
    "content+userSuspension totalActionsCount <= baseline",
    () => contentAndSuspension.totalActionsCount <= baseline.totalActionsCount,
  );
  TestValidator.predicate(
    "content-removal-only totalActionsCount <= content+userSuspension totalActionsCount",
    () =>
      contentRemovalOnly.totalActionsCount <=
      contentAndSuspension.totalActionsCount,
  );

  // Non-requested types in the multi-type filter should have zero counts
  for (const bucket of contentAndSuspension.actionsByType) {
    if (
      bucket.actionType === contentRemovalType ||
      bucket.actionType === userSuspensionType
    ) {
      continue;
    }
    TestValidator.predicate(
      "non-requested actionType bucket must have zero count when filtered by [content_removal, user_suspension]",
      () => bucket.count === 0,
    );
  }

  const baselineUserSuspensionBucket = baseline.actionsByType.find(
    (b) => b.actionType === userSuspensionType,
  );
  const multiContentRemovalBucket = contentAndSuspension.actionsByType.find(
    (b) => b.actionType === contentRemovalType,
  );
  const multiUserSuspensionBucket = contentAndSuspension.actionsByType.find(
    (b) => b.actionType === userSuspensionType,
  );

  if (baselineContentRemovalBucket !== undefined && multiContentRemovalBucket) {
    TestValidator.predicate(
      "content+userSuspension content_removal bucket count <= baseline content_removal bucket count",
      () =>
        multiContentRemovalBucket.count <= baselineContentRemovalBucket.count,
    );
  }

  if (baselineUserSuspensionBucket !== undefined && multiUserSuspensionBucket) {
    TestValidator.predicate(
      "content+userSuspension user_suspension bucket count <= baseline user_suspension bucket count",
      () =>
        multiUserSuspensionBucket.count <= baselineUserSuspensionBucket.count,
    );
  }
}
