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

export async function test_api_moderation_decision_creation_no_action_outcome(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  // This is the prerequisite for making moderation decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: `moderator_${RandomGenerator.alphabets(6)}`,
    password: `SecurePass${RandomGenerator.alphaNumeric(8)}`,
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreate,
  });
  typia.assert(moderator);

  // Verify moderator was created successfully
  TestValidator.equals(
    "moderator email should match registration",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account status should be active",
    moderator.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator should have valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );

  // Step 2: Create moderation decision with action_type='no_action'
  // Using a generated report ID (in production, this would come from an existing report)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decisionReason =
    "Content review completed. Post does not violate community standards and demonstrates appropriate discussion practices. User contributions align with community guidelines.";

  const decisionCreate = {
    action_type: "no_action" as const,
    reason: decisionReason,
    internal_notes: "Verified content quality - no policy violations detected",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: decisionCreate,
      },
    );
  typia.assert(decision);

  // Step 3: Verify decision was created with correct action type
  TestValidator.equals(
    "decision action_type should be no_action",
    decision.action_type,
    "no_action",
  );

  // Step 4: Verify decision reason is stored correctly
  TestValidator.equals(
    "decision reason should match input",
    decision.reason,
    decisionReason,
  );

  // Step 5: Verify decision has unique ID for audit trail
  TestValidator.predicate(
    "decision ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      decision.id,
    ),
  );

  // Step 6: Verify created_at timestamp is set
  TestValidator.predicate(
    "created_at should be ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(decision.created_at),
  );

  // Step 7: Verify updated_at timestamp is set
  TestValidator.predicate(
    "updated_at should be ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(decision.updated_at),
  );

  // Step 8: Verify moderator reference in decision
  TestValidator.equals(
    "decision moderator ID should match authenticated moderator",
    decision.moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "decision moderator username should match",
    decision.moderator.username,
    moderator.username,
  );

  // Step 9: Verify report reference is linked
  TestValidator.equals(
    "decision report ID should match the target report",
    decision.report.id,
    reportId,
  );

  // Step 10: Verify no_action decision has no suspension duration
  TestValidator.predicate(
    "suspension_duration_days should be undefined for no_action decision",
    decision.suspension_duration_days === undefined ||
      decision.suspension_duration_days === null,
  );

  // Step 11: Verify internal notes are stored
  TestValidator.equals(
    "internal notes should be stored for moderator reference",
    decision.internal_notes,
    "Verified content quality - no policy violations detected",
  );
}
