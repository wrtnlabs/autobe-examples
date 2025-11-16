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
 * Test submitting duplicate moderation appeals on the same decision.
 *
 * This test validates that the system prevents members from submitting multiple
 * appeals on the same moderation decision within a cooldown period, preventing
 * appeal abuse and maintaining the integrity of the appeals process.
 *
 * The test flow:
 *
 * 1. Register a member account for submitting appeals
 * 2. Register a moderator account for making moderation decisions
 * 3. Create a moderation decision on a report
 * 4. Submit the first appeal with valid reasoning
 * 5. Attempt to submit a second appeal on the same decision
 * 6. Verify that the duplicate appeal submission fails with appropriate error
 */
export async function test_api_moderation_appeal_member_submit_appeal_duplicate_prevention(
  connection: api.IConnection,
) {
  // 1. Register member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Register moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "ModeratorPassword123!",
        href: "https://example.com/moderator-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator context to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 3. Create a moderation decision (reportId is generated for testing)
  const reportId: string = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: "Content violates community guidelines and harassment policy",
          internal_notes: "Duplicate appeal prevention test case",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.predicate(
    "decision should have valid ID",
    decision.id !== null && decision.id !== undefined,
  );

  // Switch back to member context to submit appeals
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/member-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Submit the first appeal
  const firstAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe my content did not violate community guidelines. The original post provided context that was misunderstood by the moderator.",
          supporting_evidence:
            "https://example.com/evidence/full-context-of-post",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(firstAppeal);
  TestValidator.equals(
    "first appeal status should be submitted",
    firstAppeal.appeal_status,
    "submitted",
  );
  TestValidator.predicate(
    "first appeal should be linked to the decision",
    firstAppeal.community_platform_report_decision_id === decision.id,
  );

  // 5 & 6. Attempt to submit a duplicate appeal on the same decision
  // This should fail due to duplicate prevention cooldown
  await TestValidator.error(
    "duplicate appeal on same decision should be rejected",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason:
              "Submitting another appeal for the same decision within cooldown period to test duplicate prevention",
            supporting_evidence: null,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "first appeal should have persisted with valid ID",
    firstAppeal.id !== null && firstAppeal.id !== undefined,
  );
}
