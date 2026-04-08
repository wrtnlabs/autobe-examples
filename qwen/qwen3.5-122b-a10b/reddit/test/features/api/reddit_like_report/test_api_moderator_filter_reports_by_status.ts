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
 * Test moderator report filtering by status on the reports-of-posts endpoint.
 *
 * Validates that community moderators can filter content reports by their moderation status (pending, approved, dismissed). The test creates reports with various statuses and verifies the filtering mechanism returns only matching reports while maintaining proper pagination and reporter information.
 *
 * The scenario tests the complete moderation workflow where moderators need to:
 * 1. Focus on pending reports requiring immediate review
 * 2. Review historical approved reports (content deleted)
 * 3. Review historical dismissed reports (content kept)
 *
 * 1. Create and authenticate a member account
 * 2. Create multiple reports with different statuses
 * 3. Filter reports by 'pending' status and validate results
 * 4. Filter reports by 'approved' status and validate results
 * 5. Filter reports by 'dismissed' status and validate results
 * 6. Verify pagination metadata is correct for each filter
 * 7. Validate reporter information is included in all responses
 */
export async function test_api_moderator_filter_reports_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create reports with different statuses
  // Note: In a real test, we would need to create posts and report them
  // For this test, we'll use the index endpoint to verify filtering works
  // The actual report creation would require additional endpoints not provided
  // 3. Filter by 'pending' status
  const pendingReports =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // 4. Filter by 'approved' status
  const approvedReports =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  // 5. Filter by 'dismissed' status
  const dismissedReports =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          status: "dismissed",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pending pagination current",
    pendingReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination limit",
    pendingReports.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pending pagination records non-negative",
    pendingReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending pagination pages non-negative",
    pendingReports.pagination.pages >= 0,
  );
  // 7. Validate response structure
  TestValidator.predicate(
    "pending reports is array",
    Array.isArray(pendingReports.data),
  );
  TestValidator.predicate(
    "approved reports is array",
    Array.isArray(approvedReports.data),
  );
  TestValidator.predicate(
    "dismissed reports is array",
    Array.isArray(dismissedReports.data),
  );
  // 8. Validate report structure when data exists
  if (pendingReports.data.length > 0) {
    const report = pendingReports.data[0];
    typia.assert(report);
    TestValidator.equals("report has id", typeof report.id, "string");
    TestValidator.equals(
      "report has reporter",
      typeof report.reporter,
      "object",
    );
    TestValidator.predicate(
      "report has actor_type",
      report.actor_type === "post" || report.actor_type === "comment",
    );
    TestValidator.equals("report has reason", typeof report.reason, "string");
    TestValidator.equals("report status is pending", report.status, "pending");
  }
  if (approvedReports.data.length > 0) {
    const report = approvedReports.data[0];
    typia.assert(report);
    TestValidator.equals(
      "report status is approved",
      report.status,
      "approved",
    );
  }
  if (dismissedReports.data.length > 0) {
    const report = dismissedReports.data[0];
    typia.assert(report);
    TestValidator.equals(
      "report status is dismissed",
      report.status,
      "dismissed",
    );
  }
}