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

export async function test_api_moderation_appeal_submission_automatic_field_population(
  connection: api.IConnection,
) {
  // Step 1: Create member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member account created", member.id !== undefined);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPassword123!";
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created",
    moderator.id !== undefined,
  );

  // Step 3: Authenticate as moderator and create a report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "Violation of community standards with clear evidence of policy breach",
          internal_notes: "Pattern of repeat violations detected",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.predicate("report decision created", decision.id !== undefined);

  // Step 4: Authenticate as member and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const beforeAppealSubmit = new Date();
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe the moderation decision was made in error. I did not violate any community standards and request reconsideration of this decision.",
          supporting_evidence: "https://example.com/evidence/screenshot.png",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  const afterAppealSubmit = new Date();
  typia.assert(appeal);

  // Step 5: Validate auto-populated fields are correctly set

  // Verify community_platform_member_id comes from JWT authentication context, not request
  TestValidator.equals(
    "community_platform_member_id extracted from JWT authentication",
    appeal.community_platform_member_id,
    member.id,
  );

  // Verify appeal_status auto-set to 'submitted'
  TestValidator.equals(
    "appeal_status automatically set to submitted",
    appeal.appeal_status,
    "submitted",
  );

  // Verify appeal_reviewer_id is null (no reviewer assigned yet)
  TestValidator.equals(
    "appeal_reviewer_id is null with no reviewer assigned",
    appeal.appeal_reviewer_id,
    null,
  );

  // Verify appeal_outcome is null (no decision made yet)
  TestValidator.equals(
    "appeal_outcome is null with no review decision yet",
    appeal.appeal_outcome,
    null,
  );

  // Verify submitted_at timestamp is current UTC time
  const submittedAtTime = new Date(appeal.submitted_at);
  TestValidator.predicate(
    "submitted_at set to current UTC timestamp",
    submittedAtTime.getTime() >= beforeAppealSubmit.getTime() &&
      submittedAtTime.getTime() <= afterAppealSubmit.getTime(),
  );

  // Verify created_at timestamp is current UTC time
  const createdAtTime = new Date(appeal.created_at);
  TestValidator.predicate(
    "created_at set to current UTC timestamp",
    createdAtTime.getTime() >= beforeAppealSubmit.getTime() &&
      createdAtTime.getTime() <= afterAppealSubmit.getTime(),
  );

  // Verify request body fields are correctly stored
  TestValidator.equals(
    "appeal_reason stored correctly from request",
    appeal.appeal_reason,
    "I believe the moderation decision was made in error. I did not violate any community standards and request reconsideration of this decision.",
  );

  TestValidator.equals(
    "supporting_evidence stored correctly from request",
    appeal.supporting_evidence,
    "https://example.com/evidence/screenshot.png",
  );

  // Verify appellant information is correctly populated
  TestValidator.equals(
    "appellant ID matches authenticated member from JWT",
    appeal.appellant.id,
    member.id,
  );

  TestValidator.equals(
    "decision reference matches submitted decision ID",
    appeal.decision.id,
    decision.id,
  );
}
