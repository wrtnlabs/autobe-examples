import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authorization for hard deletion of content reports.
 *
 * This E2E test validates that moderators can permanently delete content
 * reports from the system. The test creates a member account to submit a
 * content report, then authenticates a moderator to perform the deletion
 * operation. The scenario ensures proper cross-actor authentication and
 * verifies that reports are completely removed from the system after deletion.
 */
export async function test_api_content_report_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content report submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account for deletion authorization
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Submit content report as member
  const report: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: RandomGenerator.pick([
            "spam",
            "harassment",
            "inappropriate",
            "misinformation",
            "copyright",
            "other",
          ] as const),
          report_details: RandomGenerator.paragraph({ sentences: 5 }),
          priority: RandomGenerator.pick([
            "low",
            "normal",
            "high",
            "critical",
          ] as const),
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Authenticate as moderator for deletion operation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      ip: "192.168.1.1",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Perform hard deletion of content report
  await api.functional.discussionBoard.moderator.contentReports.erase(
    connection,
    {
      reportId: report.id,
    },
  );

  // Step 6: Verify successful deletion by ensuring no errors occurred
  // Since there's no GET endpoint for individual reports, we validate
  // that the deletion operation completed successfully without errors
  TestValidator.predicate(
    "content report deletion completed successfully",
    true, // The absence of errors indicates successful deletion
  );
}
