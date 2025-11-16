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
 * Test that internal_notes field is optional and stores moderator-only context.
 *
 * This test validates the optional behavior of the internal_notes field when
 * creating moderation decisions. The internal_notes field allows moderators to
 * store investigation findings, pattern detection notes, and cross-moderator
 * coordination information that is not visible to regular users.
 *
 * Test scenarios:
 *
 * 1. Create decision without internal_notes - should succeed with null/undefined
 *    notes
 * 2. Create decision with internal_notes containing investigation findings -
 *    should store notes
 * 3. Create decision with empty string for internal_notes - verify behavior
 * 4. Create decision with maximum length internal_notes - verify handling
 * 5. Create decision with special characters in internal_notes - verify encoding
 * 6. Verify internal_notes are properly returned in decision response
 *
 * Workflow:
 *
 * 1. Authenticate moderator account
 * 2. Create sample report data
 * 3. Create decision without internal_notes
 * 4. Create decision with various internal_notes values
 * 5. Validate responses and internal_notes content
 */
export async function test_api_moderation_decision_internal_notes_optional(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test report ID (using random UUID)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test creating decision without internal_notes (optional field omitted)
  const decisionWithoutNotes: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "no_action",
          reason: "Content review completed. No violation found.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithoutNotes);
  TestValidator.equals(
    "decision without notes has null internal_notes",
    decisionWithoutNotes.internal_notes,
    null,
  );
  TestValidator.equals(
    "decision reason matches",
    decisionWithoutNotes.reason,
    "Content review completed. No violation found.",
  );

  // Step 4: Test creating decision with internal_notes containing investigation findings
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const investigationNotes =
    "Third violation by user in 30 days. Pattern of harassment detected. Recommend escalation.";
  const decisionWithNotes: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: {
          action_type: "issue_warning",
          reason: "Content violates community harassment policy.",
          internal_notes: investigationNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithNotes);
  TestValidator.equals(
    "decision with notes stores notes correctly",
    decisionWithNotes.internal_notes,
    investigationNotes,
  );

  // Step 5: Test creating decision with empty string for internal_notes
  const reportId3 = typia.random<string & tags.Format<"uuid">>();
  const decisionWithEmptyNotes: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId3,
        body: {
          action_type: "remove_content",
          reason: "Removed content that violates community standards.",
          internal_notes: "",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithEmptyNotes);

  // Step 6: Test creating decision with special characters in internal_notes
  const reportId4 = typia.random<string & tags.Format<"uuid">>();
  const specialCharNotes =
    "Special chars test: @#$%^&*() <script> quotes: \"test\" 'test' newline\ntest";
  const decisionWithSpecialChars: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId4,
        body: {
          action_type: "issue_warning",
          reason: "Community policy violation detected.",
          internal_notes: specialCharNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithSpecialChars);
  TestValidator.equals(
    "decision preserves special characters in notes",
    decisionWithSpecialChars.internal_notes,
    specialCharNotes,
  );

  // Step 7: Test creating decision with maximum length internal_notes
  const reportId5 = typia.random<string & tags.Format<"uuid">>();
  const maxLengthNotes = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const decisionWithLongNotes: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId5,
        body: {
          action_type: "suspend_user",
          reason: "Repeated violations require temporary account suspension.",
          internal_notes: maxLengthNotes,
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithLongNotes);
  TestValidator.predicate(
    "long internal_notes are stored correctly",
    decisionWithLongNotes.internal_notes === maxLengthNotes,
  );

  // Step 8: Verify all decisions have correct structure and moderator attribution
  TestValidator.predicate(
    "all decisions have moderator information",
    decisionWithoutNotes.moderator !== null &&
      decisionWithNotes.moderator !== null,
  );
  TestValidator.predicate(
    "decisions have proper action types",
    [
      "no_action",
      "remove_content",
      "issue_warning",
      "suspend_user",
      "ban_user",
      "escalate",
    ].includes(decisionWithNotes.action_type),
  );
}
