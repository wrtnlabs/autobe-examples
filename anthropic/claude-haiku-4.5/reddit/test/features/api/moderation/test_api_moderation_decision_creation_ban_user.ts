import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test successful creation of a moderation decision with action_type
 * 'ban_user'.
 *
 * This test validates that a moderator can create a permanent ban decision on a
 * report for a user violating community rules. The test verifies:
 *
 * - A report can be created for a severe violation
 * - A moderator can create a ban decision with mandatory reason and optional
 *   notes
 * - The decision is recorded with ban_user action type
 * - The response includes complete decision details with moderator attribution
 * - HTTP 201 status is returned for successful decision creation
 *
 * Complete workflow:
 *
 * 1. Register member to be banned
 * 2. Register reporter member
 * 3. Register moderator
 * 4. Reporter creates report for severe violation
 * 5. Moderator creates ban decision
 * 6. Verify decision details and audit trail
 */
export async function test_api_moderation_decision_creation_ban_user(
  connection: api.IConnection,
) {
  // 1. Create member to be banned
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: bannedMemberEmail,
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/register",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(bannedMember);

  // 2. Create reporter member
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/register",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 3. Create moderator with stored password for later login
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(12),
        password: moderatorPassword,
        href: "https://example.com/join",
        referrer: "https://example.com/register",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Reporter creates report for banned member
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_member_id: bannedMember.id,
        category: "hate_speech",
        additional_details:
          "User engaged in severe harassment and hate speech violations repeatedly",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.equals(
    "report created successfully",
    report.status,
    "submitted",
  );
  TestValidator.equals(
    "report category is hate_speech",
    report.category,
    "hate_speech",
  );
  TestValidator.equals(
    "reported member matches banned user",
    report.reported_member?.id,
    bannedMember.id,
  );

  // 5. Switch to moderator context and create ban decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "ban_user",
          reason:
            "User has violated hate speech policy with severe harassment. Multiple violations recorded. Account permanently removed from platform.",
          internal_notes:
            "Third violation within 30 days. Pattern of targeted harassment. Recommend permanent ban to protect community safety.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 6. Verify decision details
  TestValidator.equals(
    "decision action type is ban_user",
    decision.action_type,
    "ban_user",
  );
  TestValidator.predicate(
    "reason is provided and meets minimum length",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "internal notes are stored",
    decision.internal_notes !== undefined && decision.internal_notes !== null,
    true,
  );
  TestValidator.equals(
    "moderator is assigned to decision",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "decision resolves the correct report",
    decision.report.id,
    report.id,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    decision.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    decision.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active decision",
    decision.deleted_at,
    null,
  );
}
