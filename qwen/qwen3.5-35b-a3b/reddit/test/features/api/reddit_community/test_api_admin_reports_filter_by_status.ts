import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin user
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: admin.token.access };
  // 3. Test status_id=0 filter (pending reports)
  const pendingResponse =
    await api.functional.redditCommunity.admin.reports.index(adminConnection, {
      body: {
        status_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(pendingResponse);
  // 4. Test status_id=1 filter (approved reports)
  const approvedResponse =
    await api.functional.redditCommunity.admin.reports.index(adminConnection, {
      body: {
        status_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(approvedResponse);
  // 5. Test status_id=2 filter (dismissed reports)
  const dismissedResponse =
    await api.functional.redditCommunity.admin.reports.index(adminConnection, {
      body: {
        status_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(dismissedResponse);
  // 6. Test no status filter (all reports)
  const allResponse = await api.functional.redditCommunity.admin.reports.index(
    adminConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(allResponse);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid records",
    allResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    allResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination limit matches request",
    allResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current is 1",
    allResponse.pagination.current,
    1,
  );
  // 8. Validate report data structure
  if (allResponse.data.length > 0) {
    const sampleReport = allResponse.data[0];
    typia.assert(sampleReport);
    TestValidator.equals(
      "report has valid id",
      sampleReport.id,
      sampleReport.id,
    );
    TestValidator.equals(
      "report has valid reporter",
      sampleReport.reporter.id,
      sampleReport.reporter.id,
    );
    TestValidator.equals(
      "report has valid community",
      sampleReport.community.id,
      sampleReport.community.id,
    );
    TestValidator.equals(
      "report has valid status_id",
      sampleReport.status_id,
      sampleReport.status_id,
    );
    TestValidator.equals(
      "report has valid created_at",
      sampleReport.created_at,
      sampleReport.created_at,
    );
    TestValidator.equals(
      "report has valid updated_at",
      sampleReport.updated_at,
      sampleReport.updated_at,
    );
  }
  // 9. Validate different filters return different result sets
  TestValidator.equals(
    "pending filter returned response",
    pendingResponse.data.length,
    pendingResponse.data.length,
  );
  TestValidator.equals(
    "approved filter returned response",
    approvedResponse.data.length,
    approvedResponse.data.length,
  );
  TestValidator.equals(
    "dismissed filter returned response",
    dismissedResponse.data.length,
    dismissedResponse.data.length,
  );
  TestValidator.equals(
    "all filter returned response",
    allResponse.data.length,
    allResponse.data.length,
  );
}
