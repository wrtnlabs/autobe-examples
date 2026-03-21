import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving the authenticated member's complete report submission history.
 *
 * Prerequisites:
 * 1. Authenticate as a member using POST /redditClone/auth/member/join to obtain JWT token
 * 2. Reports must exist in the system submitted by the authenticated member
 *
 * Test Steps:
 * 1. Call PATCH /redditClone/member/reports with an empty request body to retrieve all reports
 * 2. Validate response returns paginated list with data array
 * 3. Verify response includes IPage.IPagination with current, limit, records, pages
 * 4. Verify each report in IRedditCloneReport.ISummary contains: id, target_type (post/comment),
 *    target_id, reason, status, created_at, community
 * 5. For post reports, verify post_title and post_content are populated when target_type is 'post'
 * 6. For comment reports, verify comment_content is populated when target_type is 'comment'
 * 7. Verify reports are sorted by created_at in descending order (most recent first)
 * 8. Validate pagination metadata is accurate
 */
export async function test_api_report_history_view_all(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Call the reports endpoint with empty body to retrieve all reports
  const reportsResponse = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(reportsResponse);
  // Step 3: Validate response structure
  TestValidator.equals(
    "has pagination",
    reportsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(reportsResponse.data),
    true,
  );
  // Step 4: Validate pagination metadata
  const pagination = reportsResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // Validate pagination consistency
  if (reportsResponse.data.length > 0) {
    TestValidator.predicate(
      "records >= data length",
      pagination.records >= reportsResponse.data.length,
    );
  }
  // Step 5: Validate each report structure
  for (const report of reportsResponse.data) {
    typia.assert(report);
    // Verify required fields exist
    TestValidator.predicate("report has id", report.id.length > 0);
    TestValidator.predicate(
      "target_type is valid",
      report.target_type === "post" || report.target_type === "comment",
    );
    TestValidator.predicate("target_id is valid", report.target_id.length > 0);
    TestValidator.predicate("reason is valid", report.reason.length > 0);
    TestValidator.predicate(
      "status is valid",
      report.status === "pending" ||
        report.status === "approved" ||
        report.status === "dismissed",
    );
    TestValidator.predicate(
      "created_at is valid",
      report.created_at.length > 0,
    );
    // Validate community exists
    TestValidator.equals("community exists", report.community !== null, true);
    TestValidator.predicate("community has id", report.community.id.length > 0);
    TestValidator.predicate(
      "community has name",
      report.community.name.length > 0,
    );
    // Validate content-specific fields based on target_type
    if (report.target_type === "post") {
      TestValidator.predicate(
        "post reports have post_title",
        report.post_title !== undefined,
      );
      TestValidator.predicate(
        "post reports have post_content",
        report.post_content !== undefined,
      );
    } else if (report.target_type === "comment") {
      TestValidator.predicate(
        "comment reports have comment_content",
        report.comment_content !== undefined,
      );
    }
  }
  // Step 6: Verify sorting (most recent first) - compare created_at timestamps
  if (reportsResponse.data.length > 1) {
    for (let i = 0; i < reportsResponse.data.length - 1; i++) {
      const current = new Date(reportsResponse.data[i].created_at);
      const next = new Date(reportsResponse.data[i + 1].created_at);
      TestValidator.predicate(
        "reports sorted by created_at descending",
        current >= next,
      );
    }
  }
}
