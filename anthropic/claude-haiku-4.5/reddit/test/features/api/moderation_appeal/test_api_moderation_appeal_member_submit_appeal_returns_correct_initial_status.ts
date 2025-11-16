import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Validates that newly submitted appeals receive the correct initial status.
 *
 * Tests the moderation appeal submission workflow to ensure appeals are created
 * with the "submitted" status, indicating they are ready for reviewer
 * assignment. Verifies the appeal state machine initializes correctly and all
 * related references are properly established.
 *
 * Workflow:
 *
 * 1. Register member and moderator accounts for multi-actor scenario
 * 2. Create a moderation decision that the member can appeal
 * 3. Submit an appeal against the decision
 * 4. Verify appeal status is "submitted" (initial state)
 * 5. Confirm no reviewer is assigned yet (null)
 * 6. Validate appeal references decision and appellant correctly
 */
export async function test_api_moderation_appeal_member_submit_appeal_returns_correct_initial_status(
  connection: api.IConnection,
) {
  // 1. Register member account (appellant)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Create a moderation decision that can be appealed
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with multiple personal attacks and threats toward other members",
          internal_notes:
            "Third violation in 30 days, escalating enforcement action",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 4. Switch back to member authentication for appeal submission
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 5. Submit the moderation appeal
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe the decision was unjust. The conversation was context where I was responding to a false accusation made against me. My response should be understood in that context.",
          supporting_evidence: "https://example.com/screenshots/context",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // 6. CORE VALIDATION: Verify appeal initial status is "submitted"
  TestValidator.equals(
    "appeal status should be submitted on creation",
    appeal.appeal_status,
    "submitted",
  );

  // 7. Verify no reviewer is assigned initially
  TestValidator.predicate(
    "reviewer should be unassigned initially",
    appeal.reviewer === null || appeal.reviewer === undefined,
  );

  // 8. Validate appeal references are correct
  TestValidator.equals(
    "appeal decision ID should reference created decision",
    appeal.decision.id,
    decision.id,
  );

  TestValidator.equals(
    "appellant ID should be the submitting member",
    appeal.appellant.id,
    member.id,
  );

  // 9. Verify appeal has appeal_reason populated
  TestValidator.predicate(
    "appeal reason should be substantive (min 50 chars)",
    appeal.appeal_reason.length >= 50,
  );

  // 10. Verify appeal outcome is null (not yet reviewed)
  TestValidator.predicate(
    "appeal outcome should be null before review",
    appeal.appeal_outcome === null || appeal.appeal_outcome === undefined,
  );

  // 11. Verify reviewed_at is null (not yet reviewed)
  TestValidator.predicate(
    "reviewed_at should be null until reviewer completes review",
    appeal.reviewed_at === null || appeal.reviewed_at === undefined,
  );

  // 12. Verify submitted_at timestamp is populated
  TestValidator.predicate(
    "submitted_at should be populated with submission timestamp",
    appeal.submitted_at !== undefined &&
      appeal.submitted_at !== null &&
      appeal.submitted_at.length > 0,
  );
}
