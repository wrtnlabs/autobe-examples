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
 * Test moderator creating a decision to issue a warning to a user for rule
 * violation.
 *
 * This test validates the moderation workflow where a moderator reviews a
 * report and issues a formal warning to the reported user. The warning is
 * recorded as a moderation decision without escalating to content removal or
 * account suspension.
 *
 * The test flow:
 *
 * 1. Register a moderator account with full moderation privileges
 * 2. Register a member account who will be the subject of the warning
 * 3. Create a content violation report (simulated via test ID)
 * 4. As the moderator, create a decision to issue a warning with proper reason
 * 5. Verify the warning decision is recorded and contains all required information
 */
export async function test_api_moderation_decision_moderator_create_issue_warning(
  connection: api.IConnection,
) {
  // 1. Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator token issued successfully",
    moderatorAuth.token !== undefined,
  );

  // 2. Register member account (user who will receive warning)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member token issued successfully",
    memberAuth.token !== undefined,
  );

  // 3. Use moderator authentication for decision creation
  connection.headers ??= {};
  connection.headers.Authorization = moderatorAuth.token.access;

  // Use a valid UUID for the report ID
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create moderation decision to issue warning
  const warningReason =
    "User violated community harassment policy by engaging in disrespectful behavior toward other members. This is a formal warning to comply with community standards.";
  const internalNotes =
    "First offense, escalate to suspension if repeated within 30 days.";

  const decisionResponse =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "issue_warning",
          reason: warningReason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionResponse);

  // 5. Verify warning decision properties
  TestValidator.equals(
    "decision action type is warning",
    decisionResponse.action_type,
    "issue_warning",
  );
  TestValidator.equals(
    "decision reason matches input",
    decisionResponse.reason,
    warningReason,
  );
  TestValidator.equals(
    "decision internal notes match input",
    decisionResponse.internal_notes,
    internalNotes,
  );
  TestValidator.predicate(
    "decision has valid moderator information",
    decisionResponse.moderator !== undefined &&
      decisionResponse.moderator.id.length > 0,
  );
  TestValidator.predicate(
    "decision has valid report reference",
    decisionResponse.report !== undefined &&
      decisionResponse.report.id.length > 0,
  );
  TestValidator.predicate(
    "decision created timestamp is valid",
    decisionResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "decision updated timestamp is valid",
    decisionResponse.updated_at.length > 0,
  );
  TestValidator.equals(
    "suspension duration not set for warning action",
    decisionResponse.suspension_duration_days,
    null,
  );
  TestValidator.equals(
    "decision is not deleted",
    decisionResponse.deleted_at,
    null,
  );
}
