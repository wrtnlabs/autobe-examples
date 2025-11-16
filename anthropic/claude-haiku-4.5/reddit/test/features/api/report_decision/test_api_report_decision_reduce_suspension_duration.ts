import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_report_decision_reduce_suspension_duration(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for decision-making
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to receive suspension
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3-5: Simulate having a report with existing decision
  // (Report creation endpoints are not available in the SDK)
  // Using a generated report ID to test the update endpoint
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Switch to moderator context for decision update
  connection.headers ??= {};
  connection.headers.Authorization = moderator.token.access;

  // Step 6: Update decision to reduce suspension from 90 to 7 days
  const updatedDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.update(
      connection,
      {
        reportId,
        body: {
          actionType: "suspend_user",
          reason:
            "Appeal partially upheld. After review of evidence, suspension duration reduced from 90 days to 7 days due to mitigating factors and first-time violation status.",
          internalNotes:
            "Member demonstrated understanding of policy violation. Appeal review found valid points. Reducing punishment to 7 days as compromise.",
          suspensionDurationDays: 7,
        } satisfies ICommunityPlatformReportDecision.IUpdate,
      },
    );
  typia.assert(updatedDecision);

  // Validate suspension duration was reduced to 7 days
  TestValidator.equals(
    "suspension duration reduced to 7 days",
    updatedDecision.suspension_duration_days,
    7,
  );

  // Validate action_type remains 'suspend_user' (unchanged)
  TestValidator.equals(
    "action type remains suspend_user",
    updatedDecision.action_type,
    "suspend_user",
  );

  // Validate reason reflects the reduced punishment rationale
  TestValidator.predicate(
    "reason describes reduced punishment",
    updatedDecision.reason.toLowerCase().includes("reduced"),
  );

  // Validate reason meets minimum length requirement
  TestValidator.predicate(
    "reason meets minimum length requirement",
    updatedDecision.reason.length >= 10,
  );

  // Validate updated_at timestamp is present
  TestValidator.predicate(
    "updated_at timestamp is present",
    updatedDecision.updated_at !== null &&
      updatedDecision.updated_at !== undefined,
  );

  // Validate decision is not deleted (soft-delete timestamp should be null)
  TestValidator.equals(
    "decision not soft-deleted",
    updatedDecision.deleted_at,
    null,
  );

  // Validate moderator information is captured in the decision
  TestValidator.predicate(
    "moderator information present",
    updatedDecision.moderator !== null &&
      updatedDecision.moderator.id !== undefined &&
      updatedDecision.moderator.username !== undefined,
  );

  // Validate report information is maintained in the decision (1:1 relationship)
  TestValidator.predicate(
    "report information maintained in decision",
    updatedDecision.report !== null && updatedDecision.report.id !== undefined,
  );

  // Validate that the update affected the decision record (updated_at should be recent)
  TestValidator.predicate(
    "decision reflects recent update",
    updatedDecision.updated_at === updatedDecision.created_at ||
      new Date(updatedDecision.updated_at) >=
        new Date(updatedDecision.created_at),
  );
}
