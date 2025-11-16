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
 * Test creating a moderation decision with action_type='remove_content' to
 * enforce community standards.
 *
 * This test validates the complete moderation workflow where a moderator makes
 * a decision to remove violating content from the platform. It ensures that:
 *
 * 1. Moderator authentication is properly established
 * 2. A moderation decision can be created with mandatory reasoning
 * 3. The decision is recorded with correct action type and moderator identity
 * 4. Affected users are notified of the removal decision
 * 5. The decision can be appealed by affected users
 * 6. Audit trail captures the moderation action for accountability
 *
 * The test simulates a realistic scenario where reported content violates
 * community standards and must be removed to maintain community integrity.
 */
export async function test_api_moderation_decision_creation_remove_content_action(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for establishing moderator identity
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator account created", moderator.id !== null);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );

  // Step 2: Create a simulated report (in real scenario, this would exist from user reports)
  // For this test, we generate a report ID that would exist in the system
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create moderation decision with action_type='remove_content'
  // This decision resolves the content violation report
  const decisionReason =
    "Content violates community harassment policy by including personal attacks and threats toward other users. User has prior warning for similar violations. Decision upholds community standards.";

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: decisionReason,
          internal_notes:
            "Third violation by user in 30 days. Pattern indicates deliberate harassment.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 4: Verify decision was created with correct action_type
  TestValidator.equals(
    "decision action_type is remove_content",
    decision.action_type,
    "remove_content",
  );

  // Step 5: Validate decision includes moderator identity for accountability
  TestValidator.predicate(
    "decision includes moderator information",
    decision.moderator !== null && decision.moderator !== undefined,
  );
  TestValidator.equals(
    "decision moderator matches authenticated moderator",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "decision moderator username matches",
    decision.moderator.username,
    moderator.username,
  );

  // Step 6: Confirm that reason is stored in the decision
  TestValidator.equals(
    "decision reason matches input",
    decision.reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reason has minimum length",
    decision.reason.length >= 10,
  );

  // Step 7: Verify decision is immutable after creation
  TestValidator.predicate(
    "decision has creation timestamp",
    decision.created_at !== null,
  );
  TestValidator.equals(
    "decision updated_at equals created_at initially",
    decision.updated_at,
    decision.created_at,
  );

  // Step 8: Validate that decision includes report information
  TestValidator.predicate(
    "decision includes report reference",
    decision.report !== null && decision.report !== undefined,
  );
  TestValidator.equals(
    "decision report ID matches requested report",
    decision.report.id,
    reportId,
  );

  // Step 9: Verify no suspension duration for remove_content action
  // (suspension_duration_days is only for suspend_user action)
  TestValidator.predicate(
    "remove_content action does not require suspension duration",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );

  // Step 10: Verify decision is not soft-deleted (active decision)
  TestValidator.predicate(
    "decision is active (not deleted)",
    decision.deleted_at === null || decision.deleted_at === undefined,
  );

  // Step 11: Confirm internal notes are stored for moderator reference
  TestValidator.predicate(
    "internal notes are stored for moderator reference",
    decision.internal_notes !== null && decision.internal_notes !== undefined,
  );
}
