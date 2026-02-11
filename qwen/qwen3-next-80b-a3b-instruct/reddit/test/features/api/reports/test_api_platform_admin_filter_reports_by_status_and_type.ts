import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_filter_reports_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Generate test data: Create multiple comment reports with different statuses
  const commentReports = ArrayUtil.repeat(
    5,
    () =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        comment_id: typia.random<string & tags.Format<"uuid">>(),
        reporter_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        status: RandomGenerator.pick(["pending", "approved", "dismissed"]) as
          | "pending"
          | "approved"
          | "dismissed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) satisfies IRedditCommunityCommentReport,
  );
  // Update connection with admin token from authorization response
  const request: IRedditCommunityCommentReport.IRequest = {
    status: "pending",
    target_type: "comment",
    sortBy: "newest",
    page: 1,
    limit: 10,
  };
  // Perform the filtered report retrieval
  const response =
    await api.functional.redditCommunity.platformAdmin.reports.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  typia.assert(response.data);
  // Validate the response structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate("total records > 0", response.pagination.records > 0);
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    Math.ceil(response.pagination.records / 10),
  );
  // Validate data: All results must have status: 'pending'
  // Since target_type='comment' and reports only have comment_id, all returned reports must have comment_id
  response.data.forEach((report) => {
    TestValidator.equals("status is pending", report.status, "pending");
    TestValidator.notEquals("comment_id is not null", report.comment_id, null);
  });
  // Ensure no approved or dismissed reports are included
  const nonPendingResult = response.data.find(
    (report) => report.status !== "pending",
  );
  TestValidator.equals(
    "no non-pending reports included",
    nonPendingResult,
    undefined,
  );
}