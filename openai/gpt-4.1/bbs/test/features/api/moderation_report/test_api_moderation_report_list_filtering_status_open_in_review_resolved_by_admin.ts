import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate admin moderation report search with status filter.
 *
 * This test authenticates as an administrator, then for each supported
 * moderation report status ("open", "in_review", "resolved", "rejected",
 * "escalated"), calls the moderation report index API with a filter for that
 * status. Verifies that the response has correct pagination structure and that
 * every returned report (if any) strictly matches the status filter. Confirms
 * server filter enforcement.
 */
export async function test_api_moderation_report_list_filtering_status_open_in_review_resolved_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + ".A$", // Ensure at least one special char
    href: "https://test-admin-join/" + RandomGenerator.alphaNumeric(8),
    referrer: "https://test-from-ref/" + RandomGenerator.alphaNumeric(8),
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Supported moderation statuses to check
  const statuses = [
    "open",
    "in_review",
    "resolved",
    "rejected",
    "escalated",
  ] as const;

  for (const status of statuses) {
    // 3. Search for moderation reports with this status
    const reqBody = {
      status,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardReport.IRequest;
    const response =
      await api.functional.discussionBoard.admin.moderation.reports.index(
        connection,
        {
          body: reqBody,
        },
      );
    typia.assert(response);
    // Pagination metadata always present
    typia.assert<IPage.IPagination>(response.pagination);
    // Data is array of ISummary
    typia.assert<IDiscussionBoardReport.ISummary[]>(response.data);
    // 4. Every returned report must have exactly the requested status
    for (const report of response.data) {
      TestValidator.equals(
        `report has status '${status}'`,
        report.status,
        status,
      );
    }
  }
}
