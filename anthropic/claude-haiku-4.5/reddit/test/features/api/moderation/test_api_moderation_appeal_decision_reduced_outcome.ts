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

export async function test_api_moderation_appeal_decision_reduced_outcome(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (appellant)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create first moderator (original decision maker)
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: RandomGenerator.alphabets(8),
        password: "ModPassword123!",
        href: "https://example.com/mod-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 3: Create second moderator (appeal reviewer)
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: RandomGenerator.alphabets(8),
        password: "ReviewerPass123!",
        href: "https://example.com/mod-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 4: Login as member to submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create a valid report decision ID (UUID format)
  const decisionId = typia.random<string & tags.Format<"uuid">>();

  // Step 6: Submit appeal against the moderation decision
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decisionId,
          appeal_reason:
            "I believe the 30-day suspension is excessive. This was my first warning and I have already taken steps to modify my behavior. A shorter suspension would be more proportional to my violation history.",
          supporting_evidence: "https://example.com/proof-of-behavioral-change",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal status should be submitted initially",
    appeal.appeal_status,
    "submitted",
  );

  // Step 7: Login as second moderator to review and reduce the punishment
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "ReviewerPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Update appeal with reduced outcome
  const reducedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "reduced",
          appeal_reviewer_id: moderator2.id,
          appeal_outcome: "suspension_reduced_to_warning",
          reviewer_notes:
            "After careful review, the appellant demonstrates genuine remorse and commitment to behavioral improvement. Given this is a first violation and the appellant has shown proactive steps toward correction, reducing the suspension to a formal warning is appropriate and proportional.",
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(reducedAppeal);

  // Step 9: Verify appeal has transitioned to 'reduced' status
  TestValidator.equals(
    "appeal status should be reduced",
    reducedAppeal.appeal_status,
    "reduced",
  );

  // Step 10: Verify appeal outcome reflects the reduction
  TestValidator.equals(
    "appeal outcome should reflect suspension_reduced_to_warning",
    reducedAppeal.appeal_outcome,
    "suspension_reduced_to_warning",
  );

  // Step 11: Verify reviewer_notes are stored
  TestValidator.predicate(
    "reviewer notes should be present and not empty",
    reducedAppeal.reviewer_notes !== null &&
      reducedAppeal.reviewer_notes !== undefined &&
      reducedAppeal.reviewer_notes.length > 0,
  );

  // Step 12: Verify reviewed_at timestamp is set
  TestValidator.predicate(
    "reviewed_at timestamp should be set when decision is made",
    reducedAppeal.reviewed_at !== null &&
      reducedAppeal.reviewed_at !== undefined,
  );

  // Step 13: Verify reviewer information is captured
  TestValidator.predicate(
    "reviewer should be assigned to the appeal",
    reducedAppeal.reviewer !== null &&
      reducedAppeal.reviewer !== undefined &&
      reducedAppeal.reviewer.id === moderator2.id,
  );

  // Step 14: Verify appellant information is preserved
  TestValidator.equals(
    "appellant should match member who created appeal",
    reducedAppeal.appellant.id,
    member.id,
  );
}
