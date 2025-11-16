import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionMetrics";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Validate moderation action metrics for a zero-activity scenario.
 *
 * Business goal
 *
 * - Ensure that when a moderation action exists but has no associated reports or
 *   appeals, the metrics endpoint still returns a fully populated
 *   ICommunityPlatformModerationActionMetrics object with all count fields set
 *   to zero and no activity timestamps.
 *
 * End-to-end flow
 *
 * 1. Join as an adminUser to establish an authenticated context.
 * 2. Create a moderation case that will own the moderation action.
 * 3. Create a moderation action header for that case without creating any reports
 *    or appeals.
 * 4. Call the metrics endpoint with the created moderation action id.
 * 5. Validate that:
 *
 *    - The moderation_action_id and embedded moderation_action summary.id match the
 *         created action id.
 *    - Total_related_reports is 0.
 *    - All report bucket counters (post/comment/community/user) are 0 across total,
 *         open, in_review, resolved, and dismissed.
 *    - Appeal_counts.total and all status buckets are 0.
 *    - All *_reported_at and *_appealed_at timestamps are undefined, because there
 *         is no related activity.
 */
export async function test_api_moderation_action_metrics_zero_activity(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain an authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case to own the moderation action
  const caseBody = {
    case_key: `case_${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: null,
    status: "open",
    priority: "normal",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Create a moderation action header under that case with no reports/appeals
  const actionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "warn",
    scope: "user",
    reason_category: "spam",
    reason_detail: null,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: actionBody,
      },
    );
  typia.assert(moderationAction);

  // 4. Call metrics endpoint for the created moderation action
  const metrics: ICommunityPlatformModerationActionMetrics =
    await api.functional.communityPlatform.adminUser.moderationActions.metrics.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(metrics);

  // 5. Business logic validations for zero-activity metrics

  // 5-1. Moderation action id alignment
  TestValidator.equals(
    "metrics.moderation_action_id matches created action id",
    metrics.moderation_action_id,
    moderationAction.id,
  );

  if (metrics.moderation_action !== undefined) {
    TestValidator.equals(
      "metrics.moderation_action summary.id matches created action id",
      metrics.moderation_action.id,
      moderationAction.id,
    );
  }

  // 5-2. Overall reports count is zero
  TestValidator.equals(
    "total_related_reports is zero in zero-activity scenario",
    metrics.total_related_reports,
    0,
  );

  // Helper to validate a single report bucket object
  const assertReportBucketZero = (
    titlePrefix: string,
    bucket: {
      total: number;
      open: number;
      in_review: number;
      resolved: number;
      dismissed: number;
    },
  ): void => {
    TestValidator.equals(`${titlePrefix} total is 0`, bucket.total, 0);
    TestValidator.equals(`${titlePrefix} open is 0`, bucket.open, 0);
    TestValidator.equals(`${titlePrefix} in_review is 0`, bucket.in_review, 0);
    TestValidator.equals(`${titlePrefix} resolved is 0`, bucket.resolved, 0);
    TestValidator.equals(`${titlePrefix} dismissed is 0`, bucket.dismissed, 0);
  };

  assertReportBucketZero("post_report_counts", metrics.post_report_counts);
  assertReportBucketZero(
    "comment_report_counts",
    metrics.comment_report_counts,
  );
  assertReportBucketZero(
    "community_report_counts",
    metrics.community_report_counts,
  );
  assertReportBucketZero("user_report_counts", metrics.user_report_counts);

  // 5-3. Appeal counts are zero
  TestValidator.equals(
    "appeal_counts.total is 0 when no appeals exist",
    metrics.appeal_counts.total,
    0,
  );
  TestValidator.equals(
    "appeal_counts.pending is 0 when no appeals exist",
    metrics.appeal_counts.pending,
    0,
  );
  TestValidator.equals(
    "appeal_counts.approved is 0 when no appeals exist",
    metrics.appeal_counts.approved,
    0,
  );
  TestValidator.equals(
    "appeal_counts.rejected is 0 when no appeals exist",
    metrics.appeal_counts.rejected,
    0,
  );
  TestValidator.equals(
    "appeal_counts.withdrawn is 0 when no appeals exist",
    metrics.appeal_counts.withdrawn,
    0,
  );

  // 5-4. Activity timestamps are undefined in zero-activity scenario
  TestValidator.equals(
    "first_reported_at is undefined when there are no reports",
    metrics.first_reported_at,
    undefined,
  );
  TestValidator.equals(
    "last_reported_at is undefined when there are no reports",
    metrics.last_reported_at,
    undefined,
  );
  TestValidator.equals(
    "first_appealed_at is undefined when there are no appeals",
    metrics.first_appealed_at,
    undefined,
  );
  TestValidator.equals(
    "last_appealed_at is undefined when there are no appeals",
    metrics.last_appealed_at,
    undefined,
  );
}
