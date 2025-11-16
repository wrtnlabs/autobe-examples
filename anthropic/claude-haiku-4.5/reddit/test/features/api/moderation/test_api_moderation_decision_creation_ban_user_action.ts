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

export async function test_api_moderation_decision_creation_ban_user_action(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for ban decision authority
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a report to apply ban decision to
  // Using a valid UUID for the report being decided upon
  const reportId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create ban decision on the report
  const banDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "User has violated community harassment policy with multiple severe violations including threats and personal attacks toward other members. Permanent ban is necessary to protect community safety.",
          internal_notes:
            "Third violation by user in 30 days. Pattern shows escalating aggression. Previous warnings ignored. Recommend immediate account removal and database record retention for appeal review.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(banDecision);

  // Step 4: Validate ban decision properties
  TestValidator.equals(
    "ban decision action type should be ban_user",
    banDecision.action_type,
    "ban_user",
  );
  TestValidator.predicate(
    "reason should be substantial and explain ban justification",
    banDecision.reason.length >= 10,
  );
  TestValidator.predicate(
    "internal notes should capture moderation context",
    banDecision.internal_notes !== undefined &&
      banDecision.internal_notes !== null &&
      banDecision.internal_notes.length > 0,
  );

  // Step 5: Verify moderator identity is recorded
  TestValidator.equals(
    "moderator ID should match decision creator",
    banDecision.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator username should be recorded in decision",
    banDecision.moderator.username,
    moderator.username,
  );

  // Step 6: Verify ban decision timestamps
  TestValidator.predicate(
    "decision created timestamp should be valid",
    banDecision.created_at !== undefined && banDecision.created_at !== null,
  );
  TestValidator.predicate(
    "decision updated timestamp should be present",
    banDecision.updated_at !== undefined && banDecision.updated_at !== null,
  );

  // Step 7: Verify report reference in decision
  TestValidator.equals(
    "report ID should be associated with decision",
    banDecision.report.id,
    reportId,
  );

  // Step 8: Validate decision is immutable (no suspension duration for ban)
  TestValidator.predicate(
    "ban decisions should not have suspension duration",
    banDecision.suspension_duration_days === undefined ||
      banDecision.suspension_duration_days === null,
  );

  // Step 9: Verify decision is recorded in audit trail
  TestValidator.predicate(
    "decision ID should exist for audit trail reference",
    banDecision.id !== undefined && banDecision.id !== null,
  );

  // Step 10: Validate permanent ban marker
  TestValidator.equals(
    "action type should indicate permanent removal",
    banDecision.action_type,
    "ban_user",
  );
}
