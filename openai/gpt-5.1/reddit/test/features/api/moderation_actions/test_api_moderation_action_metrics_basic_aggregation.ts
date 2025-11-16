import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionMetrics";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Basic aggregation and identity validation for moderation action metrics.
 *
 * This test exercises the happy path for retrieving metrics of a single
 * moderation action as an adminUser, while staying within the subset of
 * functionality actually exposed by the generated SDK. It validates identity
 * consistency and basic arithmetic invariants of the metrics object instead of
 * attempting to seed detailed report and appeal data that would require
 * non-existent APIs in this context.
 *
 * High level workflow:
 *
 * 1. Join as an adminUser to obtain an authorized admin context.
 * 2. Create a moderation case that will own the moderation action.
 * 3. Create an account restriction episode to represent enforcement.
 * 4. Create a moderation action header referencing the case and restriction.
 * 5. Fetch aggregated metrics for the created moderation action.
 * 6. Validate identity linkage and arithmetic consistency in the metrics.
 * 7. Verify that unauthenticated access to the metrics endpoint is rejected.
 */
export async function test_api_moderation_action_metrics_basic_aggregation(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain an authorized admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case that will own the moderation action.
  const caseBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: caseBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Create an account restriction episode to represent enforcement.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    starts_at: now.toISOString(),
    ends_at: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 4. Create a moderation action header referencing the case and restriction.
  const actionTypeOptions = [
    "warn_user",
    "restrict_account",
    "remove_content",
  ] as const;
  const scopeOptions = ["user", "content", "community"] as const;
  const reasonCategoryOptions = [
    "spam",
    "harassment",
    "policy_violation",
  ] as const;

  const chosenActionType = RandomGenerator.pick(actionTypeOptions);
  const chosenScope = RandomGenerator.pick(scopeOptions);
  const chosenReasonCategory = RandomGenerator.pick(reasonCategoryOptions);

  const actionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: chosenActionType,
    scope: chosenScope,
    reason_category: chosenReasonCategory,
    reason_detail: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 5. Fetch aggregated metrics for the created moderation action.
  const metrics: ICommunityPlatformModerationActionMetrics =
    await api.functional.communityPlatform.adminUser.moderationActions.metrics.at(
      connection,
      { moderationActionId: moderationAction.id },
    );
  typia.assert<ICommunityPlatformModerationActionMetrics>(metrics);

  // 6. Validate identity linkage and arithmetic consistency in the metrics.
  TestValidator.equals(
    "metrics.moderation_action_id should match created moderation action id",
    metrics.moderation_action_id,
    moderationAction.id,
  );

  if (
    metrics.moderation_action !== undefined &&
    metrics.moderation_action !== null
  ) {
    const summary = metrics.moderation_action;
    TestValidator.equals(
      "metrics.moderation_action summary id should match action id",
      summary.id,
      moderationAction.id,
    );
    TestValidator.equals(
      "metrics.moderation_action summary scope should match created action scope",
      summary.scope,
      moderationAction.scope,
    );
    TestValidator.equals(
      "metrics.moderation_action summary action_type should match created action action_type",
      summary.action_type,
      moderationAction.action_type,
    );
    TestValidator.equals(
      "metrics.moderation_action summary reason_category should match created action reason_category",
      summary.reason_category,
      moderationAction.reason_category,
    );
  }

  const sumReports =
    metrics.post_report_counts.total +
    metrics.comment_report_counts.total +
    metrics.community_report_counts.total +
    metrics.user_report_counts.total;

  TestValidator.equals(
    "total_related_reports should equal sum of per-type totals",
    metrics.total_related_reports,
    sumReports,
  );

  const nonNegativeCounts: number[] = [
    metrics.post_report_counts.total,
    metrics.post_report_counts.open,
    metrics.post_report_counts.in_review,
    metrics.post_report_counts.resolved,
    metrics.post_report_counts.dismissed,
    metrics.comment_report_counts.total,
    metrics.comment_report_counts.open,
    metrics.comment_report_counts.in_review,
    metrics.comment_report_counts.resolved,
    metrics.comment_report_counts.dismissed,
    metrics.community_report_counts.total,
    metrics.community_report_counts.open,
    metrics.community_report_counts.in_review,
    metrics.community_report_counts.resolved,
    metrics.community_report_counts.dismissed,
    metrics.user_report_counts.total,
    metrics.user_report_counts.open,
    metrics.user_report_counts.in_review,
    metrics.user_report_counts.resolved,
    metrics.user_report_counts.dismissed,
    metrics.appeal_counts.total,
    metrics.appeal_counts.pending,
    metrics.appeal_counts.approved,
    metrics.appeal_counts.rejected,
    metrics.appeal_counts.withdrawn,
  ];

  for (const value of nonNegativeCounts) {
    TestValidator.predicate(
      "all metrics count fields must be non-negative",
      value >= 0,
    );
  }

  // 7. Verify that unauthenticated access to the metrics endpoint is rejected.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to moderation action metrics should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.metrics.at(
        unauthConnection,
        { moderationActionId: moderationAction.id },
      );
    },
  );
}
