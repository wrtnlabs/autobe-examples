import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test creating a member ban with the minimum allowed reason length (50
 * characters).
 *
 * Validates that the ban system enforces the 50-character minimum requirement
 * for ban_reason field, ensuring moderators provide sufficiently detailed
 * justifications for bans. This test creates a member ban with exactly 50
 * characters in the ban_reason field and verifies the ban is accepted and
 * stored correctly.
 *
 * Setup steps:
 *
 * 1. Create moderator account for ban creation
 * 2. Create member account to be banned
 * 3. Generate random IDs for report decision reference (prerequisite)
 * 4. Create member ban with exactly 50-character reason
 * 5. Verify ban is created successfully with correct minimum length
 */
export async function test_api_member_bans_create_with_minimum_reason(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for ban creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Re-authenticate as moderator (SDK maintains token from join)
  // The join operation already authenticated the moderator
  // We use the existing connection with moderator's token

  // Step 4: Generate prerequisite IDs for report decision
  // These would normally be created through the report workflow
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Create member ban with exactly 50-character reason (minimum length)
  // Generate a 50-character reason string
  const banReasonBase =
    "This member violated community harassment policy. Account suspension warranted.";
  const banReason =
    banReasonBase.length >= 50
      ? banReasonBase.substring(0, 50)
      : banReasonBase + RandomGenerator.alphabets(50 - banReasonBase.length);

  TestValidator.equals("ban reason has minimum length", banReason.length, 50);

  const ban =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: reportDecisionId,
          ban_reason: banReason,
          appeal_eligible_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 6: Verify ban creation with minimum reason length
  TestValidator.equals(
    "banned member ID matches",
    ban.community_platform_member_id,
    member.id,
  );
  TestValidator.equals("ban reason matches input", ban.ban_reason, banReason);
  TestValidator.equals(
    "ban reason meets minimum length requirement",
    ban.ban_reason.length,
    50,
  );
  TestValidator.predicate(
    "ban reason is exactly 50 characters",
    ban.ban_reason.length === 50,
  );
}
