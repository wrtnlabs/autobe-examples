import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate moderation report detail not found (404) for non-existent reportId.
 *
 * This test ensures that when an authenticated admin attempts to retrieve
 * details of a moderation report that does not exist (including soft-deleted
 * cases), the API returns a not found error without leaking any details. It
 * verifies that proper error handling is enforced and that no sensitive or
 * internal information is exposed.
 *
 * Workflow:
 *
 * 1. Register a new administrator via /auth/admin/join and obtain authentication.
 * 2. Issue a GET request for moderation report detail with a random (non-existent)
 *    UUID as reportId.
 * 3. Assert that the API responds with an error (not found), confirming no data is
 *    disclosed.
 */
export async function test_api_moderation_report_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://admin-portal.test/join",
        referrer: "https://admin-portal.test/login",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Try to retrieve a moderation report for a non-existent (random) UUID
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not found error for non-existent moderation report",
    async () => {
      await api.functional.discussionBoard.admin.moderation.reports.at(
        connection,
        {
          reportId: nonExistentReportId,
        },
      );
    },
  );
}
