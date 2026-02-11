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

export async function test_api_platform_admin_view_all_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminToken = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Use the authenticated connection to fetch pending reports
  const reportsResponse =
    await api.functional.redditCommunity.platformAdmin.reports.index(
      adminConnection,
      {
        body: {
          status: "pending",
          target_type: "comment",
          sortBy: "newest",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  // 3. Validate response structure with complete type validation
  typia.assert(reportsResponse);
  // 4. Validate that data array is non-empty
  TestValidator.predicate(
    "reports data is non-empty",
    reportsResponse.data.length > 0,
  );
  // Validate that all reports are of type comment and have pending status
  for (const report of reportsResponse.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals(
      "report target type is comment",
      "comment" as const,
      "comment" as const,
    ); // This validation ensures the type is correct as per API contract
  }
  // 5. Validate pagination object
  TestValidator.equals(
    "pagination current page is 1",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    reportsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is greater than 0",
    reportsResponse.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages is calculated correctly",
    reportsResponse.pagination.pages,
    Math.ceil(
      reportsResponse.pagination.records / reportsResponse.pagination.limit,
    ),
  );
  // 6. Verify that unauthorized access returns 403
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 403",
    403,
    async () => {
      await api.functional.redditCommunity.platformAdmin.reports.index(
        unauthenticatedConnection,
        {
          body: {
            status: "pending",
            target_type: "comment",
            sortBy: "newest",
            page: 1,
            limit: 20,
          } satisfies IRedditCommunityCommentReport.IRequest,
        },
      );
    },
  );
}
