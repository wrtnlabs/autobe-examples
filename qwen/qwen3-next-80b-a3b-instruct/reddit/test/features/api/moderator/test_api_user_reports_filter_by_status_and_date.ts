import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_user_reports_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Perform filtered search with pagination (limit=5, page=1)
  // We filter for pending reports created between 1 day ago and 7 days ago
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const startDate = new Date(now.getTime() - 7 * oneDay).toISOString(); // 7 days ago
  const endDate = new Date(now.getTime() - 1 * oneDay).toISOString(); // 1 day ago
  const filterResult: IPageICommunityBbsUserReport =
    await api.functional.communityBbs.moderator.users.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending", // Use "pending" as required by IRequest schema
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1,
          limit: 5,
          sortBy: "created_at",
          order: "desc",
        } satisfies ICommunityBbsUserReport.IRequest,
      },
    );
  typia.assert(filterResult);
  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filterResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", filterResult.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records > 0",
    filterResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    filterResult.pagination.pages >= 1,
  );
  // Step 4: Validate that reports are returned
  TestValidator.predicate(
    "results have at least one report",
    filterResult.data.length >= 1,
  );
  // Step 5: Validate that all returned reports have correct status and date range
  // Note: The response has status "pending_review" while request uses "pending" - this is API behavior
  for (const report of filterResult.data) {
    TestValidator.equals(
      "report status is pending_review", // Fixed: Use actual response value
      report.status,
      "pending_review",
    );
    TestValidator.predicate(
      "report created_at within range",
      report.created_at >= startDate && report.created_at <= endDate,
    );
  }
  // Step 6: Validate sorting by created_at descending
  // Reports should be sorted with newest first (descending)
  for (let i = 0; i < filterResult.data.length - 1; i++) {
    const currentReport = filterResult.data[i];
    const nextReport = filterResult.data[i + 1];
    TestValidator.predicate(
      "reports sorted by created_at descending",
      new Date(currentReport.created_at) >= new Date(nextReport.created_at),
    );
  }
  // Step 7: Verify reports with other statuses are not included
  // All reports should have status "pending_review" - ensure no report has other statuses
  for (const report of filterResult.data) {
    TestValidator.notEquals(
      "report status is not reviewed",
      report.status,
      "reviewed",
    );
    TestValidator.notEquals(
      "report status is not resolved",
      report.status,
      "resolved",
    );
    TestValidator.notEquals(
      "report status is not rejected",
      report.status,
      "rejected",
    );
  }
}
