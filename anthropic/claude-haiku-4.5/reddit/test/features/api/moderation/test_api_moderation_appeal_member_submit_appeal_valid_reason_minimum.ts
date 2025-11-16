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

export async function test_api_moderation_appeal_member_submit_appeal_valid_reason_minimum(
  connection: api.IConnection,
) {
  // Step 1: Register a member account to submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = "TestPassword123!@#";

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberResponse);

  // Step 2: Register a moderator account to create a moderation decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = "ModeratorPass123!@#";

  const moderatorResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorResponse);

  // Step 3: Create a moderation decision
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decisionReason =
    "Content violates community standards with inappropriate language and personal attacks.";

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason: decisionReason,
          suspension_duration_days: 7,
          internal_notes: "First-time violation, 7-day suspension issued",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 4: Submit a moderation appeal with minimum valid reason length (50 characters)
  // Create a reason that is exactly 50 characters long
  const minimalValidReason =
    "This decision was unfair and unjustified. I respectfully";
  TestValidator.equals(
    "appeal reason has minimum valid length of 50 characters",
    minimalValidReason.length,
    50,
  );

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: minimalValidReason,
          supporting_evidence: undefined,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 5: Verify the appeal is created successfully with minimum reason length
  TestValidator.equals(
    "appeal status is submitted",
    appeal.appeal_status,
    "submitted",
  );
  TestValidator.equals(
    "appeal reason matches the input minimum length reason",
    appeal.appeal_reason,
    minimalValidReason,
  );
}
