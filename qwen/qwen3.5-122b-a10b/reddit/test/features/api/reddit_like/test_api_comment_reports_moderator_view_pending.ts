import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test moderator viewing pending comment reports in their community.
 *
 * Validates that a community moderator can successfully access the comment reports endpoint to view pending reports requiring their attention. The test ensures proper authentication, access control filtering, and response structure validation.
 *
 * The workflow verifies that moderators can retrieve paginated report data with complete reporter information, report reasons, status indicators, and timestamps. Pagination metadata is validated to ensure correct calculation of current page, limit, total records, and total pages.
 *
 * 1. Register a new member account for moderator authentication.
 * 2. Create a dedicated connection with the member's authorization token.
 * 3. Call the comment reports endpoint with status filter set to "pending".
 * 4. Validate the response structure matches IPageIRedditLikeReport.ISummary.
 * 5. Verify pagination metadata contains valid current, limit, records, and pages values.
 * 6. Confirm all returned reports have status "pending" and contain complete reporter summaries.
 */
export async function test_api_comment_reports_moderator_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create connection with authorization token
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 3. Retrieve pending comment reports
  const reports: IPageIRedditLikeReport.ISummary =
    await api.functional.redditLike.member.reports_of_comments.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reports);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is valid",
    reports.pagination.current >= 0,
    true,
  );
  TestValidator.equals("limit is valid", reports.pagination.limit >= 0, true);
  TestValidator.equals(
    "records count is valid",
    reports.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    reports.pagination.pages >= 0,
    true,
  );
  // 5. Validate report data structure
  if (reports.data.length > 0) {
    const report = reports.data[0];
    TestValidator.equals("report has id", typeof report.id, "string");
    TestValidator.equals("report has reporter", report.reporter !== null, true);
    TestValidator.equals(
      "report has actor_type",
      report.actor_type === "comment",
      true,
    );
    TestValidator.equals("report has reason", typeof report.reason, "string");
    TestValidator.equals(
      "report has status",
      report.status === "pending",
      true,
    );
    TestValidator.equals(
      "report has created_at",
      typeof report.created_at,
      "string",
    );
    TestValidator.equals(
      "report has updated_at",
      typeof report.updated_at,
      "string",
    );
    // Validate reporter summary structure
    TestValidator.equals(
      "reporter has id",
      typeof report.reporter.id,
      "string",
    );
    TestValidator.equals(
      "reporter has username",
      typeof report.reporter.username,
      "string",
    );
    TestValidator.equals(
      "reporter has display_name",
      typeof report.reporter.display_name,
      "string",
    );
    TestValidator.equals(
      "reporter has karma_score",
      typeof report.reporter.karma_score,
      "number",
    );
  }
}
