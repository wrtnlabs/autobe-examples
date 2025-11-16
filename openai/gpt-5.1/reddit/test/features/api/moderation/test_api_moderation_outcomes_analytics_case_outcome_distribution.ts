import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAnalyticsOutcomes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsOutcomes";

export async function test_api_moderation_outcomes_analytics_case_outcome_distribution(
  connection: api.IConnection,
) {
  // 1. Admin user joins to obtain an authorized admin context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Build a moderation outcomes analytics request covering a recent time window.
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const analyticsRequest = {
    createdAtFrom: from.toISOString(),
    createdAtTo: now.toISOString(),
    // Broad filters: no communityIds, no explicit actionTypes, no explicit caseStatuses.
    communityIds: undefined,
    actionTypes: undefined,
    caseStatuses: undefined,
    limitCommunities: undefined,
    timezone: "UTC",
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  const analytics: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsOutcomes>(analytics);

  // 3. Basic structural sanity checks using TestValidator on top of typia.assert.
  TestValidator.predicate(
    "totalActionsCount is non-negative",
    analytics.totalActionsCount >= 0,
  );
  TestValidator.predicate(
    "contentRemovalCount is non-negative",
    analytics.contentRemovalCount >= 0,
  );
  TestValidator.predicate(
    "communityRestrictionCount is non-negative",
    analytics.communityRestrictionCount >= 0,
  );
  TestValidator.predicate(
    "userSuspensionCount is non-negative",
    analytics.userSuspensionCount >= 0,
  );
  TestValidator.predicate(
    "warningOnlyCount is non-negative",
    analytics.warningOnlyCount >= 0,
  );
  TestValidator.predicate(
    "noActionCount is non-negative",
    analytics.noActionCount >= 0,
  );
  TestValidator.predicate(
    "caseResolutionRate between 0 and 1",
    analytics.caseResolutionRate >= 0 && analytics.caseResolutionRate <= 1,
  );

  // 4. Compute basic aggregates from caseOutcomeDistribution.
  const totalOutcomeCases = analytics.caseOutcomeDistribution.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  TestValidator.predicate(
    "totalOutcomeCases is non-negative",
    totalOutcomeCases >= 0,
  );

  // Identify common canonical outcome buckets if present.
  const outcomeTypes = analytics.caseOutcomeDistribution.map(
    (b) => b.outcomeType,
  );

  const resolvedWithActionBucket =
    analytics.caseOutcomeDistribution.find(
      (b) => b.outcomeType === "resolved_with_action",
    ) ?? null;
  const resolvedWithoutActionBucket =
    analytics.caseOutcomeDistribution.find(
      (b) => b.outcomeType === "resolved_without_action",
    ) ?? null;
  const dismissedBucket =
    analytics.caseOutcomeDistribution.find(
      (b) => b.outcomeType === "dismissed",
    ) ?? null;
  const appealUpheldBucket =
    analytics.caseOutcomeDistribution.find(
      (b) => b.outcomeType === "appeal_upheld",
    ) ?? null;
  const appealOverturnedBucket =
    analytics.caseOutcomeDistribution.find(
      (b) => b.outcomeType === "appeal_overturned",
    ) ?? null;

  // 5. If these canonical outcome types are present, perform internal
  // consistency checks relating their counts to high-level metrics.
  const resolvedWithActionCount = resolvedWithActionBucket?.count ?? 0;
  const resolvedWithoutActionCount = resolvedWithoutActionBucket?.count ?? 0;
  const dismissedCount = dismissedBucket?.count ?? 0;
  const appealUpheldCount = appealUpheldBucket?.count ?? 0;
  const appealOverturnedCount = appealOverturnedBucket?.count ?? 0;

  const sumCanonicalBuckets =
    resolvedWithActionCount +
    resolvedWithoutActionCount +
    dismissedCount +
    appealUpheldCount +
    appealOverturnedCount;

  TestValidator.predicate(
    "sum of canonical caseOutcomeDistribution buckets does not exceed totalOutcomeCases",
    sumCanonicalBuckets <= totalOutcomeCases,
  );

  // 6. Relate noActionCount to the resolved_without_action bucket when present.
  if (resolvedWithoutActionBucket !== null) {
    TestValidator.predicate(
      "noActionCount is at least resolved_without_action count when that bucket is present",
      analytics.noActionCount >= resolvedWithoutActionCount,
    );
  }

  // 7. Relate resolution rate to the caseOutcomeDistribution when there are
  // any outcome cases. We cannot know the absolute denominator (total cases in
  // the filter), but caseResolutionRate should be compatible with the
  // proportion of resolved-like buckets among totalOutcomeCases.
  if (totalOutcomeCases > 0) {
    const resolvedLikeCount =
      resolvedWithActionCount +
      resolvedWithoutActionCount +
      appealUpheldCount +
      appealOverturnedCount;

    const resolvedLikeRatio = resolvedLikeCount / totalOutcomeCases;

    // Allow some tolerance because the backend may include cases in the
    // resolution-rate denominator that are not yet in caseOutcomeDistribution
    // buckets (depending on implementation). We just require that the
    // resolution rate is not absurdly inconsistent with the observed
    // resolved-like ratio.
    TestValidator.predicate(
      "caseResolutionRate is not dramatically higher than resolved-like ratio",
      analytics.caseResolutionRate <= resolvedLikeRatio + 0.5,
    );
    TestValidator.predicate(
      "caseResolutionRate is not dramatically lower than resolved-like ratio when there are outcome cases",
      analytics.caseResolutionRate + 0.5 >= resolvedLikeRatio,
    );
  }

  // 8. If a canonical outcome bucket exists, ensure its outcomeType string is
  // non-empty and appears exactly once in the distribution array.
  const ensureUniqueBucket = (outcomeType: string): void => {
    const matches = analytics.caseOutcomeDistribution.filter(
      (b) => b.outcomeType === outcomeType,
    );
    TestValidator.predicate(
      `outcomeType '${outcomeType}' appears at most once in caseOutcomeDistribution`,
      matches.length <= 1,
    );
    if (matches.length === 1) {
      TestValidator.predicate(
        `outcomeType '${outcomeType}' has non-negative count`,
        matches[0].count >= 0,
      );
    }
  };

  const canonicalOutcomeTypes = [
    "resolved_with_action",
    "resolved_without_action",
    "dismissed",
    "appeal_upheld",
    "appeal_overturned",
  ] as const;

  for (const outcomeType of canonicalOutcomeTypes) {
    if (outcomeTypes.includes(outcomeType)) {
      ensureUniqueBucket(outcomeType);
    }
  }
}
