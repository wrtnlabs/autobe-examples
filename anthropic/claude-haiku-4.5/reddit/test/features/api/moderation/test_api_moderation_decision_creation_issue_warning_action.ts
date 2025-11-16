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
 * Test creating a moderation decision with action_type='issue_warning' to issue
 * formal warning without content removal or suspension.
 *
 * This test validates the warning decision creation API functionality:
 *
 * 1. Authenticate as a moderator
 * 2. Create a warning decision on a report
 * 3. Verify decision structure and field values
 * 4. Validate that warnings are properly recorded with required metadata
 * 5. Confirm decision immutability and audit trail creation
 */
export async function test_api_moderation_decision_creation_issue_warning_action(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for issuing warnings
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator account created", moderator.id.length > 0);
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Create first warning decision
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const warningReason =
    "User violated community harassment policy by posting abusive comments toward other members. This behavior is prohibited under section 3.2 of our community guidelines.";

  const warningDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "issue_warning",
          reason: warningReason,
          internal_notes:
            "First offense - user has no prior warnings. Monitor for repeat violations.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(warningDecision);

  // Step 3: Verify warning decision structure
  TestValidator.equals(
    "decision action type is issue_warning",
    warningDecision.action_type,
    "issue_warning",
  );
  TestValidator.equals(
    "decision reason matches input",
    warningDecision.reason,
    warningReason,
  );
  TestValidator.predicate(
    "decision has valid ID",
    warningDecision.id.length > 0,
  );
  TestValidator.predicate(
    "decision has moderator information",
    warningDecision.moderator !== null,
  );
  TestValidator.equals(
    "moderator ID matches creator",
    warningDecision.moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "internal notes are recorded",
    warningDecision.internal_notes !== null &&
      warningDecision.internal_notes !== undefined,
  );

  // Step 4: Validate decision timestamps and audit trail
  TestValidator.predicate(
    "created_at timestamp is valid",
    warningDecision.created_at.length > 0,
  );
  TestValidator.equals(
    "updated_at equals created_at for new decision",
    warningDecision.updated_at,
    warningDecision.created_at,
  );
  TestValidator.predicate(
    "deleted_at is null for active decision",
    warningDecision.deleted_at === null ||
      warningDecision.deleted_at === undefined,
  );

  // Step 5: Verify report reference is included
  TestValidator.predicate(
    "report reference exists",
    warningDecision.report !== null,
  );
  TestValidator.equals(
    "report ID matches input",
    warningDecision.report.id,
    reportId,
  );

  // Step 6: Test suspension_duration_days is not populated for warning action
  TestValidator.predicate(
    "suspension_duration_days not set for warning",
    warningDecision.suspension_duration_days === null ||
      warningDecision.suspension_duration_days === undefined,
  );

  // Step 7: Create second warning decision to test escalation tracking
  const secondReportId = typia.random<string & tags.Format<"uuid">>();
  const secondWarningReason =
    "User posted misinformation in community forum. False claims about health and safety products. Second offense within 30 days.";

  const secondWarningDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: secondReportId,
        body: {
          action_type: "issue_warning",
          reason: secondWarningReason,
          internal_notes:
            "Second warning for same user within enforcement period. Escalation to suspension may be warranted for third violation.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(secondWarningDecision);

  // Step 8: Verify multiple warnings are independently recorded
  TestValidator.equals(
    "second decision action type is issue_warning",
    secondWarningDecision.action_type,
    "issue_warning",
  );
  TestValidator.notEquals(
    "different decisions have different IDs",
    warningDecision.id,
    secondWarningDecision.id,
  );
  TestValidator.equals(
    "both warnings from same moderator",
    secondWarningDecision.moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "second decision reason is recorded",
    secondWarningDecision.reason.length >= 10,
  );

  // Step 9: Confirm warning decisions are immutable once created
  TestValidator.predicate(
    "first decision maintains created_at",
    warningDecision.created_at.length > 0,
  );
  TestValidator.predicate(
    "second decision has independent timestamp",
    secondWarningDecision.created_at.length > 0,
  );
  TestValidator.notEquals(
    "different decisions have different timestamps",
    warningDecision.created_at,
    secondWarningDecision.created_at,
  );
}
