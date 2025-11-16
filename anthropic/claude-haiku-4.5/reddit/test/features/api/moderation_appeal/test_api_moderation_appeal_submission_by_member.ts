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

export async function test_api_moderation_appeal_submission_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;

  // Step 2: Create a moderator account to make initial decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: "ModPassword123!",
    href: "https://example.com/mod-register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderatorAuth);

  // Step 3: Create first report decision for minimum length appeal test
  const reportId1 = typia.random<string & tags.Format<"uuid">>();
  const decisionData1 = {
    action_type: "suspend_user",
    reason:
      "User violated community harassment policy with multiple offensive comments",
    internal_notes: "First violation",
    suspension_duration_days: 7,
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision1 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId1,
        body: decisionData1,
      },
    );
  typia.assert(decision1);
  const decisionId1 = decision1.id;

  // Step 4: Create second report decision for maximum length appeal test
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const decisionData2 = {
    action_type: "remove_content",
    reason:
      "Content violated community standards regarding inappropriate material",
    internal_notes: "Second violation",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision2 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: decisionData2,
      },
    );
  typia.assert(decision2);
  const decisionId2 = decision2.id;

  // Step 5: Create third report decision for appeal with supporting evidence
  const reportId3 = typia.random<string & tags.Format<"uuid">>();
  const decisionData3 = {
    action_type: "issue_warning",
    reason: "User posted content that needs review for policy compliance",
    internal_notes: "Third violation",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision3 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId3,
        body: decisionData3,
      },
    );
  typia.assert(decision3);
  const decisionId3 = decision3.id;

  // Step 6: Switch back to member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Test appeal with minimum reason length (50 characters)
  const minReason =
    "I believe this decision was wrong and should be reconsidered"; // Exactly 60 chars for safety
  const minReasonAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decisionId1,
          appeal_reason: minReason,
          supporting_evidence: null,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(minReasonAppeal);
  TestValidator.predicate(
    "appeal with minimum reason has valid ID",
    typeof minReasonAppeal.id === "string" && minReasonAppeal.id.length > 0,
  );
  TestValidator.equals(
    "appeal status is submitted for minimum reason test",
    minReasonAppeal.appeal_status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is ISO datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(minReasonAppeal.submitted_at),
  );
  TestValidator.equals(
    "member_id matches authenticated member",
    minReasonAppeal.community_platform_member_id,
    memberId,
  );
  TestValidator.predicate(
    "appeal reason meets minimum length requirement",
    minReasonAppeal.appeal_reason.length >= 50,
  );

  // Step 8: Test appeal with maximum reason length (1000 characters)
  const maxReasonBase = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 6,
  });
  const maxReason = maxReasonBase.substring(0, 1000);

  const maxReasonAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decisionId2,
          appeal_reason: maxReason,
          supporting_evidence: undefined,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(maxReasonAppeal);
  TestValidator.equals(
    "appeal with maximum reason has submitted status",
    maxReasonAppeal.appeal_status,
    "submitted",
  );
  TestValidator.predicate(
    "appeal reason respects maximum length constraint",
    maxReasonAppeal.appeal_reason.length <= 1000,
  );
  TestValidator.predicate(
    "appeal reason meets minimum length requirement",
    maxReasonAppeal.appeal_reason.length >= 50,
  );

  // Step 9: Test appeal with supporting evidence
  const evidenceUrl = "https://example.com/evidence/screenshot.png";
  const appealWithEvidence =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decisionId3,
          appeal_reason:
            "This decision is unjust because the context was misunderstood during review process.",
          supporting_evidence: evidenceUrl,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appealWithEvidence);
  TestValidator.equals(
    "appeal with evidence stores supporting evidence URL",
    appealWithEvidence.supporting_evidence,
    evidenceUrl,
  );
  TestValidator.equals(
    "appeal with evidence has submitted status",
    appealWithEvidence.appeal_status,
    "submitted",
  );

  // Step 10: Verify appeal properties and relationships
  TestValidator.equals(
    "appeal is linked to correct decision ID",
    appealWithEvidence.community_platform_report_decision_id,
    decisionId3,
  );
  TestValidator.predicate(
    "appellant information is populated",
    typeof appealWithEvidence.appellant.id === "string" &&
      appealWithEvidence.appellant.username !== undefined,
  );
  TestValidator.predicate(
    "decision summary is included in appeal response",
    typeof appealWithEvidence.decision.id === "string" &&
      appealWithEvidence.decision.action_type !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp is present and valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(appealWithEvidence.created_at),
  );
  TestValidator.predicate(
    "submitted_at timestamp is present and valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      appealWithEvidence.submitted_at,
    ),
  );
  TestValidator.equals(
    "appeal is in review queue with submitted status",
    appealWithEvidence.appeal_status,
    "submitted",
  );
}
