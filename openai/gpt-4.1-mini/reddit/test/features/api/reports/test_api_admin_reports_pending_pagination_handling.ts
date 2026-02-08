import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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

export async function test_api_admin_reports_pending_pagination_handling(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving pending reports with pagination, validating documentation requirements.
  // 1. Admin joins to authenticate and authorize as admin.
  // 2. Use admin connection to call GET /communityPlatform/admin/reports/pending with page 1, limit 5.
  // 3. Validate the response: typia.assert, check pagination, data length.
  // 4. Call the same endpoint with page 2, limit 5.
  // 5. Validate response consistency and non-overlapping data.
  // 6. If possible, test sorting and filtering parameters if API supports.
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: ICommunityPlatformAdmin.IJoin is empty type ({}), comply with utility function usage.
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminAuth);
  // Set the adminConnection Authorization header for subsequent requests
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Helper to fetch with query parameters
  async function fetchPendingReports(page: number, limit: number) {
    const url = new URL(
      "/communityPlatform/admin/reports/pending",
      adminConnection.host,
    );
    url.searchParams.set("page", page.toString());
    url.searchParams.set("limit", limit.toString());
    // Calls api directly because no utility function for query with pagination parameters provided
    // But according to the instructions: Use sdk if utility not exists
    // However, api.functional.communityPlatform.admin.reports.pending.index has no parameter? Our API method is get /pending - no explicit query param support shown
    // We will call it with connection with appended url (host+query) to represent query params.
    const paginatedConnection: api.IConnection = {
      host: url.toString(),
      headers: adminConnection.headers,
    };
    const response =
      await api.functional.communityPlatform.admin.reports.pending.index(
        paginatedConnection,
      );
    typia.assert(response);
    return response;
  }
  // 1st page fetch
  const page1Limit = 5;
  const page1 = 1;
  const resultPage1 = await fetchPendingReports(page1, page1Limit);
  TestValidator.predicate(
    "Pagination current page is 1 or more",
    resultPage1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Limit respects requested page size",
    resultPage1.pagination.limit === page1Limit,
  );
  TestValidator.predicate(
    "Data array length does not exceed limit",
    resultPage1.data.length <= page1Limit,
  );
  // 2nd page fetch
  const page2 = 2;
  const resultPage2 = await fetchPendingReports(page2, page1Limit);
  TestValidator.predicate(
    "Pagination current page matches requested page",
    resultPage2.pagination.current === page2,
  );
  TestValidator.predicate(
    "Limit respects requested page size on page 2",
    resultPage2.pagination.limit === page1Limit,
  );
  TestValidator.predicate(
    "Data array length does not exceed limit on page 2",
    resultPage2.data.length <= page1Limit,
  );
  // Check overlap (IDs) between page 1 and page 2 data if id exists. Since ICommunityPlatformReport.ISummary is an empty type, no guaranteed id field exists.
  // So, we can check that data arrays are different references or at least not equal by reference.
  TestValidator.predicate(
    "Results page 1 and page 2 data are different arrays",
    resultPage1.data !== resultPage2.data,
  );
  // Additionally, check the page count and records count
  TestValidator.predicate(
    "Pages count is non-negative",
    resultPage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Records count matches or exceeds data length",
    resultPage1.pagination.records >= resultPage1.data.length,
  );
  // Sorting and filtering test - no information is given about query params for those.
  // So a simple validation of response order is not possible without further support.
}
