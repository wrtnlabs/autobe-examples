import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test creating a moderation decision with comprehensive internal notes.
 *
 * This test validates the moderation decision creation workflow with detailed
 * internal notes that document investigation findings, moderator coordination,
 * and pattern analysis. Internal notes are stored but not visible to regular
 * users.
 *
 * Workflow:
 *
 * 1. Create moderator account for decision authority
 * 2. Create moderator authentication session
 * 3. Create multiple report decisions with different action types
 * 4. Verify decisions with both public reason and moderator-only internal notes
 * 5. Test various internal note content and lengths
 * 6. Validate decision structure includes moderator and report references
 */
export async function test_api_report_decision_create_with_internal_notes(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/moderator/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Ensure moderator is authenticated for decision creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 3: Create first decision - content removal with detailed investigation notes
  const reportId1 = typia.random<string & tags.Format<"uuid">>();
  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId1,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community harassment policy by including personal attacks and threats toward other users.",
          internal_notes:
            "Pattern detected: third violation by this user in 30 days. Cross-referenced with moderation logs showing similar harassment behavior. Recommend escalation if repeated after content removal. Coordinates with admin team on account history.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // Step 4: Verify first decision structure and internal notes
  TestValidator.equals(
    "first decision action type should be remove_content",
    decision1.action_type,
    "remove_content",
  );
  TestValidator.predicate(
    "first decision reason length meets minimum",
    decision1.reason.length >= 10,
  );
  TestValidator.predicate(
    "first decision internal notes are stored",
    decision1.internal_notes !== null && decision1.internal_notes !== undefined,
  );
  TestValidator.predicate(
    "internal notes contain investigation context",
    decision1.internal_notes?.includes("Pattern") === true,
  );

  // Step 5: Create second decision - user suspension with duration
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const decision2: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: {
          action_type: "suspend_user",
          reason:
            "User suspended for repeated spam violations and policy breaches.",
          internal_notes:
            "Issued 7-day suspension. Monitor for appeal. Prior warnings on file.",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // Step 6: Verify suspension decision
  TestValidator.equals(
    "second decision action type should be suspend_user",
    decision2.action_type,
    "suspend_user",
  );
  TestValidator.equals(
    "suspension duration should be 7 days",
    decision2.suspension_duration_days,
    7,
  );
  TestValidator.predicate(
    "internal notes reference suspension period",
    decision2.internal_notes?.includes("7-day") === true,
  );

  // Step 7: Create third decision - no action with brief notes
  const reportId3 = typia.random<string & tags.Format<"uuid">>();
  const decision3: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId3,
        body: {
          action_type: "no_action",
          reason:
            "Reported content does not violate community guidelines upon review.",
          internal_notes:
            "Content reviewed thoroughly. Determination: within policy bounds. No action required.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision3);

  // Step 8: Verify no-action decision
  TestValidator.equals(
    "third decision action type should be no_action",
    decision3.action_type,
    "no_action",
  );
  TestValidator.predicate(
    "no-action decision has internal notes",
    decision3.internal_notes !== null && decision3.internal_notes !== undefined,
  );

  // Step 9: Create fourth decision - warning with extended documentation
  const reportId4 = typia.random<string & tags.Format<"uuid">>();
  const decision4: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId4,
        body: {
          action_type: "issue_warning",
          reason: "User warned for policy violation. First documented offense.",
          internal_notes:
            "First warning issued. User education resources provided. Monitor account for 30 days. If additional violations occur, escalate to suspension. Keep detailed records for pattern analysis.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision4);

  // Step 10: Verify warning decision
  TestValidator.equals(
    "fourth decision action type should be issue_warning",
    decision4.action_type,
    "issue_warning",
  );
  TestValidator.predicate(
    "warning internal notes contain follow-up instructions",
    decision4.internal_notes?.includes("30 days") === true,
  );

  // Step 11: Create fifth decision - escalation with coordination notes
  const reportId5 = typia.random<string & tags.Format<"uuid">>();
  const decision5: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId5,
        body: {
          action_type: "escalate",
          reason:
            "Case escalated to administrators for further investigation and potential platform-wide action.",
          internal_notes:
            "Escalated to admin team due to severity. Multiple communities affected. Potential coordinated violation. Requires cross-community investigation.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision5);

  // Step 12: Verify escalation decision
  TestValidator.equals(
    "fifth decision action type should be escalate",
    decision5.action_type,
    "escalate",
  );
  TestValidator.predicate(
    "escalation notes document investigation scope",
    decision5.internal_notes?.includes("multiple") === true,
  );

  // Step 13: Validate all decisions have proper structure
  const decisions = [decision1, decision2, decision3, decision4, decision5];
  for (const decision of decisions) {
    TestValidator.predicate(
      "decision has valid UUID id",
      decision.id !== null &&
        decision.id !== undefined &&
        decision.id.length > 0,
    );
    TestValidator.predicate(
      "decision has moderator reference",
      decision.moderator !== null && decision.moderator !== undefined,
    );
    TestValidator.predicate(
      "decision has report reference",
      decision.report !== null && decision.report !== undefined,
    );
    TestValidator.predicate(
      "decision has creation timestamp",
      decision.created_at !== null && decision.created_at !== undefined,
    );
  }
}
