import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion attempt on non-existent content report.
 *
 * This test validates error handling when attempting to delete a report that
 * doesn't exist or has already been deleted. The test ensures proper error
 * responses and prevents unauthorized access to non-existent report IDs.
 */
export async function test_api_content_report_deletion_nonexistent(
  connection: api.IConnection,
) {
  // 1. Authenticate a moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      password: "testPassword123",
      display_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 2,
        wordMax: 6,
      }),
      bio: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
      moderation_level: "basic",
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Attempt to delete a non-existent content report
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();

  // Use TestValidator.error to verify that the deletion operation properly fails
  await TestValidator.error(
    "deletion attempt on non-existent report should fail",
    async () => {
      await api.functional.discussionBoard.moderator.contentReports.erase(
        connection,
        {
          reportId: nonExistentReportId,
        },
      );
    },
  );
}
