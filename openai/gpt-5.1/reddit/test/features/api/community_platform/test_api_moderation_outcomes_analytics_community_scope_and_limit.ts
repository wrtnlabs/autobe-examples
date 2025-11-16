import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAnalyticsOutcomes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsOutcomes";

/**
 * Validate moderation outcomes analytics filtering with communityIds and
 * limitCommunities under adminUser context.
 *
 * This test exercises the PATCH
 * /communityPlatform/adminUser/moderation/analytics/outcomes endpoint from the
 * perspective of a privileged adminUser actor, focusing on the ability to send
 * well-formed filters involving communityIds and limitCommunities and to
 * receive structurally valid, numerically sane analytics responses.
 *
 * Due to the available API surface, we cannot create or inspect concrete
 * moderation actions or per-community breakdowns directly. Instead, this test
 * validates that:
 *
 * - An adminUser can successfully join and obtain an authorized context.
 * - The analytics endpoint accepts various combinations of filter parameters,
 *   including different communityIds arrays and limitCommunities values, with a
 *   realistic time window and timezone string.
 * - The response always conforms to ICommunityPlatformModerationAnalyticsOutcomes
 *   and exhibits reasonable internal numeric constraints (non-negative counts,
 *   caseResolutionRate between 0 and 1, etc.).
 *
 * Steps:
 *
 * 1. Register a new adminUser using /auth/adminUser/join with random but valid
 *    username, email, and password values.
 * 2. Build a time window covering recent activity using ISO 8601 date-time strings
 *    for createdAtFrom (a few days in the past) and createdAtTo (now).
 * 3. Prepare two distinct sets of communityIds, each containing a handful of
 *    random UUID strings, and choose limitCommunities values 1 and 2.
 * 4. Call the analytics outcomes endpoint with filter set A:
 *
 *    - CreatedAtFrom/createdAtTo covering the same recent window.
 *    - CommunityIds = set A.
 *    - LimitCommunities = 1.
 *    - Timezone = "UTC". Assert the response type and basic numeric sanity.
 * 5. Call the analytics outcomes endpoint again with filter set B:
 *
 *    - Same time window and timezone.
 *    - CommunityIds = set B (different from set A).
 *    - LimitCommunities = 2. Assert the response type and numeric sanity.
 * 6. Optionally, issue a third call omitting communityIds (platform-wide
 *    analytics) but keeping limitCommunities to ensure that this combination is
 *    also accepted and yields a structurally valid analytics object.
 */
export async function test_api_moderation_outcomes_analytics_community_scope_and_limit(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Build a time window for analytics (from 3 days ago until now).
  const now: Date = new Date();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const from: Date = new Date(now.getTime() - threeDaysMs);
  const createdAtFrom: string & tags.Format<"date-time"> =
    from.toISOString() as string & tags.Format<"date-time">;
  const createdAtTo: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;

  // 3. Prepare communityId sets and limit values.
  const communityIdsA: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const communityIdsB: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const limitOne: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limitTwo: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const timezone = "UTC";

  // Helper for asserting numeric sanity of analytics response.
  const assertAnalyticsSanity = (
    titlePrefix: string,
    analytics: ICommunityPlatformModerationAnalyticsOutcomes,
  ): void => {
    // Basic numeric constraints on top-level counters.
    TestValidator.predicate(
      `${titlePrefix} - totalActionsCount is non-negative`,
      analytics.totalActionsCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - contentRemovalCount is non-negative`,
      analytics.contentRemovalCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - communityRestrictionCount is non-negative`,
      analytics.communityRestrictionCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - userSuspensionCount is non-negative`,
      analytics.userSuspensionCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - warningOnlyCount is non-negative`,
      analytics.warningOnlyCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - noActionCount is non-negative`,
      analytics.noActionCount >= 0,
    );

    // caseResolutionRate must be between 0 and 1.
    TestValidator.predicate(
      `${titlePrefix} - caseResolutionRate between 0 and 1`,
      analytics.caseResolutionRate >= 0 && analytics.caseResolutionRate <= 1,
    );

    // averageActionsPerCase should be non-negative.
    TestValidator.predicate(
      `${titlePrefix} - averageActionsPerCase is non-negative`,
      analytics.averageActionsPerCase >= 0,
    );

    // Buckets sanity: counts non-negative and identifiers non-empty.
    for (const bucket of analytics.actionsByType) {
      TestValidator.predicate(
        `${titlePrefix} - actionsByType bucket count non-negative`,
        bucket.count >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix} - actionsByType.actionType non-empty`,
        bucket.actionType.length > 0,
      );
    }

    for (const bucket of analytics.actionsByTarget) {
      TestValidator.predicate(
        `${titlePrefix} - actionsByTarget bucket count non-negative`,
        bucket.count >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix} - actionsByTarget.targetType non-empty`,
        bucket.targetType.length > 0,
      );
    }

    for (const bucket of analytics.actionsOverTime) {
      TestValidator.predicate(
        `${titlePrefix} - actionsOverTime bucket count non-negative`,
        bucket.count >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix} - actionsOverTime.start non-empty`,
        bucket.start.length > 0,
      );
      TestValidator.predicate(
        `${titlePrefix} - actionsOverTime.end non-empty`,
        bucket.end.length > 0,
      );
    }

    for (const bucket of analytics.caseOutcomeDistribution) {
      TestValidator.predicate(
        `${titlePrefix} - caseOutcomeDistribution bucket count non-negative`,
        bucket.count >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix} - caseOutcomeDistribution.outcomeType non-empty`,
        bucket.outcomeType.length > 0,
      );
    }
  };

  // 4. First analytics call with communityIdsA and limitCommunities = 1.
  const requestA = {
    createdAtFrom,
    createdAtTo,
    communityIds: communityIdsA,
    limitCommunities: limitOne,
    timezone,
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  const analyticsA: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: requestA,
      },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsOutcomes>(analyticsA);
  assertAnalyticsSanity("analyticsA", analyticsA);

  // 5. Second analytics call with communityIdsB and limitCommunities = 2.
  const requestB = {
    createdAtFrom,
    createdAtTo,
    communityIds: communityIdsB,
    limitCommunities: limitTwo,
    timezone,
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  const analyticsB: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: requestB,
      },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsOutcomes>(analyticsB);
  assertAnalyticsSanity("analyticsB", analyticsB);

  // 6. Third analytics call without communityIds (platform-wide) but with limitCommunities.
  const requestC = {
    createdAtFrom,
    createdAtTo,
    limitCommunities: limitTwo,
    timezone,
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  const analyticsC: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: requestC,
      },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsOutcomes>(analyticsC);
  assertAnalyticsSanity("analyticsC", analyticsC);
}
