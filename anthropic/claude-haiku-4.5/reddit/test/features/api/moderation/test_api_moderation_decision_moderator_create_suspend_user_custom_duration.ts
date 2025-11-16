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
 * Test moderator creating suspension with custom duration between 1-365 days.
 *
 * This test validates that moderators can create suspension decisions with
 * non-standard suspension periods (custom durations like 15 days, 60 days,
 * etc.) in addition to preset values. It verifies the system's flexibility in
 * allowing moderators to exercise discretion in determining appropriate
 * suspension lengths based on violation severity and user history.
 *
 * Test workflow:
 *
 * 1. Register a moderator account for making moderation decisions
 * 2. Register a member account who will be suspended (context setup)
 * 3. Create moderation decisions with various custom suspension durations
 * 4. Verify each decision accepts and records the correct custom duration
 * 5. Test boundary cases: minimum (1 day) and maximum (365 days) custom durations
 */
export async function test_api_moderation_decision_moderator_create_suspend_user_custom_duration(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register member account who will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Test custom suspension duration of 15 days
  // In production, reportId would come from actual report creation
  const reportId1 = typia.random<string & tags.Format<"uuid">>();
  const customDuration15 = 15;
  const decision15: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId1,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with multiple offensive comments targeting other members",
          internal_notes:
            "Third violation in 30 days, escalating from previous 3-day suspension",
          suspension_duration_days: customDuration15,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision15);

  // Verify the decision was created with correct custom duration
  TestValidator.equals(
    "suspension duration should be 15 days",
    decision15.suspension_duration_days,
    customDuration15,
  );
  TestValidator.equals(
    "action type should be suspend_user",
    decision15.action_type,
    "suspend_user",
  );

  // Step 4: Test custom duration of 60 days
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const customDuration60 = 60;
  const decision60: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: {
          action_type: "suspend_user",
          reason:
            "Severe hate speech and discrimination against protected groups detected in multiple posts",
          internal_notes:
            "Repeat offender with previous bans, escalating to longer suspension",
          suspension_duration_days: customDuration60,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision60);

  TestValidator.equals(
    "suspension duration should be 60 days",
    decision60.suspension_duration_days,
    customDuration60,
  );

  // Step 5: Test boundary - minimum custom duration (1 day)
  const reportId3 = typia.random<string & tags.Format<"uuid">>();
  const customDuration1 = 1;
  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId3,
        body: {
          action_type: "suspend_user",
          reason: "Minor policy violation with good user history",
          suspension_duration_days: customDuration1,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  TestValidator.equals(
    "suspension duration should be 1 day",
    decision1.suspension_duration_days,
    customDuration1,
  );

  // Step 6: Test boundary - maximum custom duration (365 days)
  const reportId4 = typia.random<string & tags.Format<"uuid">>();
  const customDuration365 = 365;
  const decision365: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId4,
        body: {
          action_type: "suspend_user",
          reason: "Extreme violations including threats and violent content",
          internal_notes:
            "Severe repeat offender, maximum suspension appropriate",
          suspension_duration_days: customDuration365,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision365);

  TestValidator.equals(
    "suspension duration should be 365 days",
    decision365.suspension_duration_days,
    customDuration365,
  );
}
