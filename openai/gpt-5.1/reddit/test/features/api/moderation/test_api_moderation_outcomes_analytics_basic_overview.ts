import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAnalyticsOutcomes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsOutcomes";

/**
 * Basic moderation outcomes analytics overview for an authenticated adminUser.
 *
 * Business goal
 *
 * - Verify that a freshly registered adminUser can call the moderation outcomes
 *   analytics endpoint with a minimal filter payload (simple createdAtFrom/To
 *   range) and receive a stable, fully-populated analytics DTO, even when there
 *   is no underlying moderation data.
 *
 * What this test validates
 *
 * 1. Admin bootstrap
 *
 *    - POST /auth/adminUser/join creates an adminUser and returns an
 *         ICommunityPlatformAdminuser.IAuthorized payload.
 *    - The SDK side effect writes the access token into the shared connection
 *         headers so that subsequent calls are authenticated as this admin.
 * 2. Minimal analytics request
 *
 *    - PATCH /communityPlatform/adminUser/moderation/analytics/outcomes is invoked
 *         with an ICommunityPlatformModerationAnalyticsOutcomes.IRequest body
 *         containing a simple last-7-days createdAtFrom/To range.
 *    - All other filters (communityIds, actionTypes, caseStatuses, limitCommunities,
 *         timezone) are omitted so that backend defaults apply.
 * 3. Stable DTO shape and numeric invariants
 *
 *    - The response is asserted against
 *         ICommunityPlatformModerationAnalyticsOutcomes using typia.assert to
 *         guarantee full structural correctness.
 *    - All counters (totalActionsCount, contentRemovalCount,
 *         communityRestrictionCount, userSuspensionCount, warningOnlyCount,
 *         noActionCount) are non-negative.
 *    - CaseResolutionRate is within [0, 1] as specified by its tags.
 *    - AverageActionsPerCase is a finite number and non-negative, reflecting an
 *         average of counts.
 *    - ActionsByType, actionsByTarget, actionsOverTime, and caseOutcomeDistribution
 *         are always present as arrays (possibly empty) so dashboards can rely
 *         on a stable schema even for empty datasets.
 */
export async function test_api_moderation_outcomes_analytics_basic_overview(
  connection: api.IConnection,
) {
  // 1. AdminUser join to obtain an authorized admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a minimal IRequest payload with a 7-day createdAt range
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - sevenDaysMs).toISOString();
  const to = now.toISOString();

  const requestBody = {
    createdAtFrom: from,
    createdAtTo: to,
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  // 3. Call moderation outcomes analytics endpoint
  const outcomes: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(outcomes);

  // 4. Numeric invariants on counters and ratios
  TestValidator.predicate(
    "totalActionsCount is non-negative",
    outcomes.totalActionsCount >= 0,
  );
  TestValidator.predicate(
    "contentRemovalCount is non-negative",
    outcomes.contentRemovalCount >= 0,
  );
  TestValidator.predicate(
    "communityRestrictionCount is non-negative",
    outcomes.communityRestrictionCount >= 0,
  );
  TestValidator.predicate(
    "userSuspensionCount is non-negative",
    outcomes.userSuspensionCount >= 0,
  );
  TestValidator.predicate(
    "warningOnlyCount is non-negative",
    outcomes.warningOnlyCount >= 0,
  );
  TestValidator.predicate(
    "noActionCount is non-negative",
    outcomes.noActionCount >= 0,
  );

  TestValidator.predicate(
    "caseResolutionRate is between 0 and 1 inclusive",
    outcomes.caseResolutionRate >= 0 && outcomes.caseResolutionRate <= 1,
  );

  TestValidator.predicate(
    "averageActionsPerCase is non-negative",
    outcomes.averageActionsPerCase >= 0,
  );

  // 5. Structural sanity checks on arrays for schema stability
  TestValidator.predicate(
    "actionsByType array exists (stable schema)",
    Array.isArray(outcomes.actionsByType),
  );
  TestValidator.predicate(
    "actionsByTarget array exists (stable schema)",
    Array.isArray(outcomes.actionsByTarget),
  );
  TestValidator.predicate(
    "actionsOverTime array exists (stable schema)",
    Array.isArray(outcomes.actionsOverTime),
  );
  TestValidator.predicate(
    "caseOutcomeDistribution array exists (stable schema)",
    Array.isArray(outcomes.caseOutcomeDistribution),
  );

  // 6. If all counters are zero, arrays must still be present and usable
  const allZeroCounters =
    outcomes.totalActionsCount === 0 &&
    outcomes.contentRemovalCount === 0 &&
    outcomes.communityRestrictionCount === 0 &&
    outcomes.userSuspensionCount === 0 &&
    outcomes.warningOnlyCount === 0 &&
    outcomes.noActionCount === 0;

  if (allZeroCounters) {
    TestValidator.predicate(
      "actionsByType is an array even when counters are zero",
      Array.isArray(outcomes.actionsByType) &&
        outcomes.actionsByType.length >= 0,
    );
    TestValidator.predicate(
      "actionsByTarget is an array even when counters are zero",
      Array.isArray(outcomes.actionsByTarget) &&
        outcomes.actionsByTarget.length >= 0,
    );
    TestValidator.predicate(
      "actionsOverTime is an array even when counters are zero",
      Array.isArray(outcomes.actionsOverTime) &&
        outcomes.actionsOverTime.length >= 0,
    );
    TestValidator.predicate(
      "caseOutcomeDistribution is an array even when counters are zero",
      Array.isArray(outcomes.caseOutcomeDistribution) &&
        outcomes.caseOutcomeDistribution.length >= 0,
    );
  }
}
