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

export async function test_api_moderation_appeal_member_submit_appeal_valid_reason_maximum(
  connection: api.IConnection,
) {
  // Step 1: Register a member who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: "TestPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Register a moderator who will make the moderation decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(),
        password: "ModeratorPass123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Authenticate as moderator to create a report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 4: Create a moderation decision on a report
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: "Content violates community guidelines and policies",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Switch back to member authentication for appeal submission
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Create a maximum-length appeal reason (exactly 1000 characters)
  let maxLengthReason = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 30,
    sentenceMax: 40,
    wordMin: 3,
    wordMax: 6,
  });
  // Trim to exactly 1000 characters
  maxLengthReason = maxLengthReason.substring(0, 1000);
  // Ensure minimum length requirement is met
  if (maxLengthReason.length < 50) {
    maxLengthReason = maxLengthReason.padEnd(1000, " ");
  }

  // Step 7: Submit the appeal with maximum-length reason
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: maxLengthReason,
          supporting_evidence: undefined,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 8: Validate that the appeal was created with maximum-length reason
  TestValidator.equals(
    "appeal reason length equals maximum allowed",
    appeal.appeal_reason.length,
    1000,
  );

  TestValidator.equals(
    "appeal reason matches submitted value",
    appeal.appeal_reason,
    maxLengthReason,
  );

  TestValidator.equals(
    "appeal status is submitted",
    appeal.appeal_status,
    "submitted",
  );

  TestValidator.predicate(
    "appeal reason is at maximum boundary",
    appeal.appeal_reason.length === 1000,
  );
}
