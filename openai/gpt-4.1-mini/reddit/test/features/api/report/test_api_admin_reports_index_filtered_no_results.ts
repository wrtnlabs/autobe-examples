import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_index_filtered_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Prepare request body for filters that guarantee no results
  // Use a non-existent UUID for communityPlatformUserId, and status 'dismissed' assuming no 'dismissed' reports exist
  const noResultFilters: ICommunityPlatformReport.IRequest = {
    communityPlatformUserId: "00000000-0000-0000-0000-000000000000",
    status: "dismissed",
    page: 1,
    limit: 10,
  };
  // 3. Call API
  const response = await api.functional.communityPlatform.admin.reports.index(
    adminConnection,
    {
      body: noResultFilters,
    },
  );
  // 4. Validate response type
  typia.assert<IPageICommunityPlatformReport.ISummary>(response);
  // 5. Check empty data and correct pagination metadata
  TestValidator.equals("empty data array", response.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
}
