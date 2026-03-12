import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated admin can retrieve all pending content reports from the platform.
   *
   * 1. Admin authenticates via authorize_admin_join utility
   * 2. Admin calls PATCH /redditClone/admin/reports with status='pending' filter
   * 3. Verify response returns paginated list with correct structure
   * 4. Verify all returned reports have status='pending'
   * 5. Verify pagination metadata is correct
   * 6. Verify reports are sorted by created_at descending
   */
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Retrieve pending reports with status filter
  const response = await api.functional.redditClone.admin.reports.index(
    adminConnection,
    {
      body: {
        status: "pending",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify all returned reports have status='pending'
  await ArrayUtil.asyncForEach(response.data, async (report) => {
    TestValidator.equals("report status is pending", report.status, "pending");
    // 5. Verify report structure
    typia.assert(report.reporter);
    typia.assert(report.community);
    // Verify either reportedPost OR reportedComment is non-null (polymorphic content)
    TestValidator.predicate(
      "report has either reportedPost or reportedComment",
      report.reportedPost !== null || report.reportedComment !== null,
    );
    // If reportedPost exists, validate its structure
    if (report.reportedPost !== null) {
      typia.assert(report.reportedPost);
      TestValidator.equals(
        "contentType matches reportedPost",
        report.contentType,
        "post",
      );
    }
    // If reportedComment exists, validate its structure
    if (report.reportedComment !== null) {
      typia.assert(report.reportedComment);
      TestValidator.equals(
        "contentType matches reportedComment",
        report.contentType,
        "comment",
      );
    }
    // Verify required fields exist
    TestValidator.predicate("report has valid id", report.id.length > 0);
    TestValidator.predicate(
      "report has valid reason",
      report.reason.length > 0,
    );
    TestValidator.predicate(
      "report has createdAt timestamp",
      report.createdAt.length > 0,
    );
    TestValidator.predicate(
      "report has updatedAt timestamp",
      report.updatedAt.length > 0,
    );
  });
  // 6. Verify reports are sorted by created_at descending (newest first)
  if (response.data.length > 1) {
    let isSortedDescending = true;
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].createdAt).getTime();
      const currDate = new Date(response.data[i].createdAt).getTime();
      if (currDate > prevDate) {
        isSortedDescending = false;
        break;
      }
    }
    TestValidator.predicate(
      "reports are sorted by created_at descending",
      isSortedDescending,
    );
  }
}
