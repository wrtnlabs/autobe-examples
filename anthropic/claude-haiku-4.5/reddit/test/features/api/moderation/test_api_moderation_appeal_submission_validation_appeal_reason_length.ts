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
 * Test the moderation appeal submission validation for appeal reason length
 * constraints.
 *
 * The system should enforce minimum (50 characters) and maximum (1000
 * characters) length requirements on the appeal_reason field to ensure
 * substantive appeals and prevent abuse.
 *
 * Test scenarios include:
 *
 * 1. Appeal with reason at minimum valid length (exactly 50 characters) - succeeds
 * 2. Appeal with reason just below minimum (49 characters) - rejected
 * 3. Appeal with reason at maximum valid length (exactly 1000 characters) -
 *    succeeds
 * 4. Appeal with reason exceeding maximum (1001 characters) - rejected
 * 5. Empty appeal_reason - rejected
 * 6. Whitespace-only reasons - handled appropriately
 *
 * This ensures appeals contain substantive member explanations without allowing
 * excessive text or frivolous submissions.
 */
export async function test_api_moderation_appeal_submission_validation_appeal_reason_length(
  connection: api.IConnection,
) {
  // Step 1: Create member account for submitting appeals
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name().replace(/\s+/g, "_"),
        password: memberPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account to generate moderation decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name().replace(/\s+/g, "_"),
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Switch to moderator account to create report decisions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 4: Create moderation decisions for testing appeals
  // Create first decision for minimum valid length test
  const reportId1 = typia.random<string & tags.Format<"uuid">>();
  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId1,
        body: {
          action_type: "suspend_user",
          reason: "User violated community harassment policy",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // Create second decision for below minimum test
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const decision2: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: {
          action_type: "remove_content",
          reason: "Content violates community guidelines",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // Create third decision for maximum valid length test
  const reportId3 = typia.random<string & tags.Format<"uuid">>();
  const decision3: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId3,
        body: {
          action_type: "issue_warning",
          reason: "User posted inappropriate content",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision3);

  // Create fourth decision for exceeding maximum test
  const reportId4 = typia.random<string & tags.Format<"uuid">>();
  const decision4: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId4,
        body: {
          action_type: "no_action",
          reason: "Content approved after review",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision4);

  // Create fifth decision for empty reason test
  const reportId5 = typia.random<string & tags.Format<"uuid">>();
  const decision5: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId5,
        body: {
          action_type: "ban_user",
          reason: "User permanently banned for severe violations",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision5);

  // Create sixth decision for whitespace test
  const reportId6 = typia.random<string & tags.Format<"uuid">>();
  const decision6: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId6,
        body: {
          action_type: "escalate",
          reason: "Case escalated for higher authority review",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision6);

  // Step 5: Switch back to member account to submit appeals
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Test valid appeal with reason at minimum length (50 characters)
  const minValidReason = "A".repeat(50);
  const minValidAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision1.id,
          appeal_reason: minValidReason,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(minValidAppeal);
  TestValidator.equals(
    "minimum valid appeal reason length (50 chars)",
    minValidAppeal.appeal_reason.length,
    50,
  );

  // Step 7: Test invalid appeal with reason below minimum (49 characters)
  const belowMinReason = "B".repeat(49);
  await TestValidator.error(
    "appeal reason below minimum length (49 chars) should fail",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision2.id,
            appeal_reason: belowMinReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Step 8: Test valid appeal with reason at maximum length (1000 characters)
  const maxValidReason = "C".repeat(1000);
  const maxValidAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision3.id,
          appeal_reason: maxValidReason,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(maxValidAppeal);
  TestValidator.equals(
    "maximum valid appeal reason length (1000 chars)",
    maxValidAppeal.appeal_reason.length,
    1000,
  );

  // Step 9: Test invalid appeal with reason exceeding maximum (1001 characters)
  const exceedsMaxReason = "D".repeat(1001);
  await TestValidator.error(
    "appeal reason exceeding maximum length (1001 chars) should fail",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision4.id,
            appeal_reason: exceedsMaxReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Step 10: Test invalid appeal with empty reason
  await TestValidator.error("empty appeal reason should fail", async () => {
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision5.id,
          appeal_reason: "",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  });

  // Step 11: Test invalid appeal with whitespace-only reason
  const whitespaceReason = " ".repeat(50);
  await TestValidator.error(
    "whitespace-only appeal reason should fail",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision6.id,
            appeal_reason: whitespaceReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );
}
