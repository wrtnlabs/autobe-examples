import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test creation of a temporary member suspension with explicit expiration date.
 *
 * This test validates the complete suspension lifecycle:
 *
 * 1. Administrator creates account
 * 2. Member creates account
 * 3. Moderator creates account
 * 4. Moderator creates a suspension decision record
 * 5. Administrator creates temporary suspension with future expires_at
 * 6. Verify suspension details including duration window and automatic expiration
 *
 * Ensures that suspension_reason is meaningful (minimum 20 chars), suspended_at
 * marks restriction start, and expires_at defines restoration point.
 */
export async function test_api_member_suspension_creation_with_temporary_duration(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate("admin account created", admin.id !== null);

  // Step 2: Create member account (the one to be suspended)
  const violatorEmail = typia.random<string & tags.Format<"email">>();
  const violatorPassword = RandomGenerator.alphaNumeric(12);
  const violator = await api.functional.auth.member.join(connection, {
    body: {
      email: violatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: violatorPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(violator);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: moderatorPassword,
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create a fake report record (in real scenario, this would come from member.reports.create)
  // For this test, we'll create a minimal report through the API
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter);

  // Step 5: Switch to moderator to create a decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a report first
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_member_id: violator.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.predicate("report created successfully", report.id !== null);

  // Step 6: Moderator creates suspension decision
  const suspensionDays = 7;
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason:
            "Violation of community harassment policy - targeted threats and abusive language towards members",
          internal_notes:
            "First offense, temporary 7-day suspension issued as disciplinary action",
          suspension_duration_days: suspensionDays,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.predicate(
    "decision created with suspension action",
    decision.action_type === "suspend_user",
  );
  TestValidator.predicate(
    "suspension duration set correctly",
    decision.suspension_duration_days === suspensionDays,
  );

  // Step 7: Switch back to administrator to create suspension record
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 8: Administrator creates suspension record with explicit expiration
  const now = new Date();
  const suspendedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + suspensionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: violator.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "Temporary suspension for 7 days due to community harassment policy violation and targeted abusive behavior towards other members",
          suspended_at: suspendedAt,
          expires_at: expiresAt,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 9: Validate suspension properties
  TestValidator.equals(
    "suspension member ID matches violator",
    suspension.community_platform_member_id,
    violator.id,
  );
  TestValidator.equals(
    "suspension decision ID matches",
    suspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "suspension reason meets minimum length requirement",
    suspension.suspension_reason.length >= 20,
  );
  TestValidator.equals(
    "suspension start timestamp matches input",
    suspension.suspended_at,
    suspendedAt,
  );
  TestValidator.equals(
    "suspension expiration timestamp matches input",
    suspension.expires_at,
    expiresAt,
  );

  // Step 10: Validate suspension duration window
  const suspendStart = new Date(suspension.suspended_at).getTime();
  const suspendEnd = new Date(suspension.expires_at!).getTime();
  const durationMs = suspendEnd - suspendStart;
  const durationDays = durationMs / (24 * 60 * 60 * 1000);
  TestValidator.predicate(
    "suspension duration is approximately 7 days",
    Math.abs(durationDays - suspensionDays) < 0.1,
  );

  // Step 11: Validate that expiration is in the future
  const currentTime = new Date().getTime();
  const expirationTime = new Date(suspension.expires_at!).getTime();
  TestValidator.predicate(
    "suspension expiration is set in future",
    expirationTime > currentTime,
  );

  // Step 12: Verify suspension timestamps are properly formatted ISO 8601 UTC
  TestValidator.predicate(
    "suspended_at is ISO 8601 UTC format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.suspended_at),
  );
  TestValidator.predicate(
    "expires_at is ISO 8601 UTC format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.expires_at!),
  );

  // Step 13: Verify suspension creates automatic restoration window
  const totalSuspensionMs = suspendEnd - suspendStart;
  const totalSuspensionHours = totalSuspensionMs / (60 * 60 * 1000);
  TestValidator.predicate(
    "suspension provides defined restoration timeframe",
    totalSuspensionHours >= 24 * (suspensionDays - 1) &&
      totalSuspensionHours <= 24 * (suspensionDays + 1),
  );
}
