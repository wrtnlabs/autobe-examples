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

export async function test_api_moderation_decision_creation_duplicate_decision(
  connection: api.IConnection,
) {
  // 1. Create a member account to submit a report
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a report targeting a member for user-level violations
  const reportedMemberId = typia.random<string & tags.Format<"uuid">>();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_member_id: reportedMemberId,
        category: "harassment",
        additional_details:
          "User is harassing other community members with threatening language",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 3. Create a moderator account to handle moderation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "ModeratorPassword123!",
        href: "https://community.example.com/auth/moderator/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Create the first decision on the report (should succeed)
  const firstDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "User behavior violates community harassment policy with documented evidence",
          internal_notes:
            "First warning issued for this user - pattern requires monitoring",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(firstDecision);
  TestValidator.equals(
    "first decision action type is warning",
    firstDecision.action_type,
    "issue_warning",
  );

  // 5. Attempt to create a second decision on the same report (should fail with unique constraint violation)
  await TestValidator.error(
    "duplicate decision creation should fail due to unique constraint",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report.id,
          body: {
            action_type: "suspend_user",
            reason: "Attempting to create duplicate decision on same report",
            suspension_duration_days: 7,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // 6. Verify the original decision remains unchanged and intact
  TestValidator.predicate(
    "first decision action type remains issue_warning",
    firstDecision.action_type === "issue_warning",
  );
  TestValidator.equals(
    "first decision reason is unchanged",
    firstDecision.reason,
    "User behavior violates community harassment policy with documented evidence",
  );
  TestValidator.predicate(
    "first decision has valid moderator information",
    firstDecision.moderator !== undefined && firstDecision.moderator !== null,
  );
  TestValidator.predicate(
    "first decision has valid report reference",
    firstDecision.report !== undefined && firstDecision.report !== null,
  );
}
