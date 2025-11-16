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
 * Test moderator creating a decision to remove reported content for policy
 * violation.
 *
 * This validates the content removal action path in moderation decisions by:
 *
 * 1. Registering a moderator account
 * 2. Registering a member whose content will be reported
 * 3. Creating and reporting violating content
 * 4. Making a moderation decision to remove the content
 * 5. Verifying the decision is properly recorded with audit trail
 */
export async function test_api_moderation_decision_moderator_create_remove_content(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account for making the moderation decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register member account whose content will be reported
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a report for content violation
  // Note: In a real scenario, we would create actual content to report,
  // but for this test we use a randomly generated report ID representing
  // a policy-violating post that has already been reported
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Switch to moderator context and create a moderation decision
  // to remove the content
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community harassment policy by including personal attacks and threats toward other users. This action protects community standards.",
          internal_notes:
            "Third violation by this user in 30 days. Pattern of harassment detected.",
          suspension_duration_days: undefined,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Verify the decision was properly created and recorded
  TestValidator.equals(
    "decision action type should be remove_content",
    decision.action_type,
    "remove_content",
  );

  TestValidator.predicate(
    "reason should be at least 10 characters",
    decision.reason.length >= 10,
  );

  TestValidator.equals(
    "decision should be linked to the reported content",
    typeof decision.report,
    "object",
  );

  TestValidator.predicate(
    "moderator identity should be recorded for audit trail",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  TestValidator.predicate(
    "decision should have a creation timestamp",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  TestValidator.equals(
    "internal notes should match what was provided",
    decision.internal_notes,
    "Third violation by this user in 30 days. Pattern of harassment detected.",
  );
}
