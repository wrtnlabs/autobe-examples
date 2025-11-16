import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test member suspension creation with explicit expiration timestamp.
 *
 * Validates that a moderator can create a suspension with a defined expires_at
 * date, enabling temporary suspensions that automatically lift after the
 * expiration time. Tests the graduated discipline system where temporary
 * suspensions enable member redemption after a defined period.
 *
 * Workflow:
 *
 * 1. Authenticate moderator actor
 * 2. Create member account
 * 3. Create moderation decision with suspend_user action
 * 4. Create member suspension with explicit expires_at timestamp
 * 5. Validate suspension details including expiration time
 */
export async function test_api_member_suspension_with_expiration_date(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create moderation decision with suspend_user action
  const suspensionDays = 7;
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with personal attacks and threats toward other members",
          suspension_duration_days: suspensionDays,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 4: Create member suspension with explicit expires_at timestamp
  const suspendedAt = new Date();
  const expiresAt = new Date(
    suspendedAt.getTime() + suspensionDays * 24 * 60 * 60 * 1000,
  );

  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "Member suspension for violating community harassment policy through repeated personal attacks and threats",
          suspended_at: suspendedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 5: Validate suspension details
  TestValidator.equals(
    "suspension member ID matches created member",
    suspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension decision ID matches created decision",
    suspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "suspension reason meets minimum length requirement",
    suspension.suspension_reason.length >= 20,
  );
  TestValidator.predicate(
    "suspended_at timestamp is in valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.suspended_at),
  );
  TestValidator.predicate(
    "expires_at timestamp is set and in valid ISO 8601 format",
    suspension.expires_at !== null &&
      suspension.expires_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.expires_at),
  );
  TestValidator.predicate(
    "expires_at is in the future relative to suspended_at",
    suspension.expires_at !== null &&
      suspension.expires_at !== undefined &&
      new Date(suspension.expires_at) > new Date(suspension.suspended_at),
  );
  TestValidator.predicate(
    "suspension duration approximates requested duration in days",
    suspension.expires_at !== null &&
      suspension.expires_at !== undefined &&
      (new Date(suspension.expires_at).getTime() -
        new Date(suspension.suspended_at).getTime()) /
        (1000 * 60 * 60 * 24) >=
        suspensionDays - 1,
  );
}
