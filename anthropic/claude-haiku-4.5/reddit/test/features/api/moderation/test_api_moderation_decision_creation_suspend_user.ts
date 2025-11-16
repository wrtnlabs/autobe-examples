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

export async function test_api_moderation_decision_creation_suspend_user(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const suspendedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "SecurePassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(suspendedMember);

  // Step 2: Create a report for serious violation
  const violationReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_member_id: suspendedMember.id,
        category: "hate_speech",
        additional_details:
          "User posted harmful content violating community standards",
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(violationReport);
  TestValidator.equals(
    "report category is hate_speech",
    violationReport.category,
    "hate_speech",
  );

  // Step 3: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "ModeratorPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Test preset suspension durations (1, 3, 7, 14, 30, 90 days)
  const presetDurations = [1, 3, 7, 14, 30, 90] as const;

  for (const duration of presetDurations) {
    // Create a new report for each test
    const testReport: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(connection, {
        body: {
          reported_member_id: suspendedMember.id,
          category: "harassment",
          additional_details: `Testing suspension with ${duration} days duration`,
          reporter_contact_email: typia.random<string & tags.Format<"email">>(),
        } satisfies ICommunityPlatformReport.ICreate,
      });
    typia.assert(testReport);

    // Create moderation decision with preset suspension duration
    const decision: ICommunityPlatformReportDecision =
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: testReport.id,
          body: {
            action_type: "suspend_user",
            reason: `User suspended for ${duration} days due to serious violation. This action is taken to protect the community and enforce platform policies.`,
            suspension_duration_days: duration,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    typia.assert(decision);

    TestValidator.equals(
      `decision action_type is suspend_user for ${duration} days`,
      decision.action_type,
      "suspend_user",
    );
    TestValidator.equals(
      `decision suspension_duration_days is ${duration}`,
      decision.suspension_duration_days,
      duration,
    );
    TestValidator.predicate(
      `decision reason contains disciplinary explanation for ${duration} days suspension`,
      decision.reason.includes("suspended") &&
        decision.reason.includes(duration.toString()),
    );
  }

  // Step 5: Test custom suspension duration within 1-365 day range
  const customDurations = [5, 45, 100, 180, 365];

  for (const customDuration of customDurations) {
    // Create a new report for each custom duration test
    const customReport: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(connection, {
        body: {
          reported_member_id: suspendedMember.id,
          category: "misinformation",
          additional_details: `Testing custom suspension duration of ${customDuration} days`,
          reporter_contact_email: typia.random<string & tags.Format<"email">>(),
        } satisfies ICommunityPlatformReport.ICreate,
      });
    typia.assert(customReport);

    // Create moderation decision with custom suspension duration
    const customDecision: ICommunityPlatformReportDecision =
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: customReport.id,
          body: {
            action_type: "suspend_user",
            reason: `User account suspended for ${customDuration} days as disciplinary action for policy violations. Account will be automatically restored after suspension period expires.`,
            suspension_duration_days: customDuration,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    typia.assert(customDecision);

    TestValidator.equals(
      `custom suspension duration is ${customDuration} days`,
      customDecision.suspension_duration_days,
      customDuration,
    );
    TestValidator.predicate(
      `suspension duration within valid range 1-365 for ${customDuration}`,
      customDuration >= 1 && customDuration <= 365,
    );
  }

  // Step 6: Verify decision structure and moderator attribution
  const finalReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_member_id: suspendedMember.id,
        category: "illegal_content",
        additional_details: "Final test for decision verification",
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(finalReport);

  const finalDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: finalReport.id,
        body: {
          action_type: "suspend_user",
          reason: "Final suspension decision test for comprehensive validation",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(finalDecision);

  // Verify decision contains moderator information
  TestValidator.predicate(
    "decision moderator is properly recorded",
    finalDecision.moderator !== null && finalDecision.moderator !== undefined,
  );

  // Verify decision contains report reference
  TestValidator.predicate(
    "decision report is properly linked",
    finalDecision.report !== null && finalDecision.report !== undefined,
  );

  // Verify suspension duration is properly stored
  TestValidator.predicate(
    "suspension duration is numeric and positive",
    typeof finalDecision.suspension_duration_days === "number" &&
      finalDecision.suspension_duration_days > 0,
  );

  TestValidator.predicate(
    "decision reason is comprehensive",
    finalDecision.reason.length >= 10,
  );
}
