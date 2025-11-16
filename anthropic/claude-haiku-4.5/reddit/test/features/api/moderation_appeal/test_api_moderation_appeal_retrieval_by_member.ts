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

export async function test_api_moderation_appeal_retrieval_by_member(
  connection: api.IConnection,
) {
  // Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member should be authorized",
    member.token !== undefined,
  );

  // Create moderator account to make initial moderation decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Create a report decision that will be appealed
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with multiple personal attacks",
          internal_notes: "Third violation by this user in 30 days",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.equals(
    "decision action type",
    decision.action_type,
    "suspend_user",
  );

  // Switch back to member context for appeal submission
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Submit moderation appeal from member account
  const appealReason = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 10,
  });
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: appealReason,
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal status should be submitted",
    appeal.appeal_status,
    "submitted",
  );
  TestValidator.equals(
    "appeal reason matches input",
    appeal.appeal_reason,
    appealReason,
  );
  TestValidator.predicate(
    "supporting evidence should be present",
    appeal.supporting_evidence !== undefined,
  );

  // Test 1: Retrieve appeal immediately after submission
  const retrievedAppealSubmitted: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(retrievedAppealSubmitted);
  TestValidator.equals(
    "retrieved appeal ID matches created appeal",
    retrievedAppealSubmitted.id,
    appeal.id,
  );
  TestValidator.equals(
    "appeal status is submitted",
    retrievedAppealSubmitted.appeal_status,
    "submitted",
  );
  TestValidator.predicate(
    "appeal has appellant information",
    retrievedAppealSubmitted.appellant !== undefined,
  );
  TestValidator.predicate(
    "appeal has decision context",
    retrievedAppealSubmitted.decision !== undefined,
  );
  TestValidator.predicate(
    "appeal has submitted_at timestamp",
    retrievedAppealSubmitted.submitted_at !== undefined,
  );

  // Test 2: Verify complete appeal structure and all required fields
  const completeAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(completeAppeal);

  // Verify all timestamps are present
  TestValidator.predicate(
    "appeal has created_at timestamp",
    completeAppeal.created_at !== undefined,
  );
  TestValidator.predicate(
    "appeal has updated_at timestamp",
    completeAppeal.updated_at !== undefined,
  );

  // Verify appellant information is complete
  TestValidator.predicate(
    "appellant has id",
    completeAppeal.appellant.id !== undefined,
  );
  TestValidator.predicate(
    "appellant has username",
    completeAppeal.appellant.username !== undefined,
  );
  TestValidator.predicate(
    "appellant has email",
    completeAppeal.appellant.email !== undefined,
  );
  TestValidator.predicate(
    "appellant has account status",
    completeAppeal.appellant.account_status !== undefined,
  );

  // Verify decision context is complete
  TestValidator.predicate(
    "decision has id",
    completeAppeal.decision.id !== undefined,
  );
  TestValidator.predicate(
    "decision has action_type",
    completeAppeal.decision.action_type !== undefined,
  );
  TestValidator.predicate(
    "decision has reason",
    completeAppeal.decision.reason !== undefined,
  );
  TestValidator.predicate(
    "decision has created_at",
    completeAppeal.decision.created_at !== undefined,
  );

  // Test 3: Verify appeal reason and supporting evidence are persisted
  TestValidator.equals(
    "appeal reason persists correctly",
    completeAppeal.appeal_reason,
    appealReason,
  );
  TestValidator.equals(
    "supporting evidence persists correctly",
    completeAppeal.supporting_evidence,
    "https://example.com/evidence",
  );

  // Test 4: Verify appeal status field indicates submission state
  TestValidator.predicate(
    "appeal status is one of valid states",
    ["submitted", "in_review", "approved", "denied", "reduced"].includes(
      completeAppeal.appeal_status,
    ),
  );
}
