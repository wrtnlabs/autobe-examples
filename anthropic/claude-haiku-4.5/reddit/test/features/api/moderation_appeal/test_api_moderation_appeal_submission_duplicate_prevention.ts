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
 * Validates duplicate appeal prevention on moderation decisions.
 *
 * This test ensures that the system prevents members from submitting multiple
 * appeals on the same moderation decision. The appeal system should enforce
 * uniqueness to prevent abuse and spam of the review queue.
 *
 * Workflow:
 *
 * 1. Create member and moderator accounts
 * 2. Create a report and moderation decision
 * 3. Submit first appeal - should succeed
 * 4. Attempt duplicate appeal - should fail with error
 * 5. Verify error indicates existing appeal
 */
export async function test_api_moderation_appeal_submission_duplicate_prevention(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.name(1),
    password: memberPassword,
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "member created successfully",
    memberAuth.id !== null,
    true,
  );

  // 2. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.name(1),
    password: moderatorPassword,
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator created successfully",
    moderatorAuth.id !== null,
    true,
  );

  // 3. Login as moderator to create a report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 4. Create a moderation decision on a report
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decisionData = {
    action_type: "issue_warning" as const,
    reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    internal_notes: "Test decision for duplicate appeal prevention",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId,
        body: decisionData,
      },
    );
  typia.assert(decision);
  TestValidator.equals(
    "decision created successfully",
    decision.id !== null,
    true,
  );

  // 5. Switch back to member account to submit first appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const firstAppealData = {
    community_platform_report_decision_id: decision.id,
    appeal_reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    supporting_evidence: "https://example.com/evidence",
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  const firstAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: firstAppealData,
      },
    );
  typia.assert(firstAppeal);
  TestValidator.equals(
    "first appeal status is submitted",
    firstAppeal.appeal_status,
    "submitted",
  );
  TestValidator.equals(
    "first appeal has correct decision ID",
    firstAppeal.community_platform_report_decision_id,
    decision.id,
  );

  // 6. Attempt to submit duplicate appeal - should fail
  const secondAppealData = {
    community_platform_report_decision_id: decision.id,
    appeal_reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    supporting_evidence: "https://example.com/evidence2",
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  await TestValidator.error("duplicate appeal should be rejected", async () => {
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: secondAppealData,
      },
    );
  });

  // 7. Verify that attempting multiple duplicate appeals also fails
  for (let i = 0; i < 2; i++) {
    const duplicateAppealData = {
      community_platform_report_decision_id: decision.id,
      appeal_reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 4,
        wordMax: 8,
      }),
      supporting_evidence: `https://example.com/evidence${i}`,
    } satisfies ICommunityPlatformModerationAppeal.ICreate;

    await TestValidator.error(
      `duplicate appeal attempt ${i + 1} should fail`,
      async () => {
        await api.functional.communityPlatform.member.moderationAppeals.create(
          connection,
          {
            body: duplicateAppealData,
          },
        );
      },
    );
  }

  TestValidator.predicate(
    "duplicate appeal prevention enforced successfully",
    true,
  );
}
