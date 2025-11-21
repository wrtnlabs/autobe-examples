import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAdmin";
import type { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReport";

export async function test_api_admin_report_audit_filter_by_date_range(
  connection: api.IConnection,
) {
  // Authenticate as administrator
  const admin: ICommunityBBSAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<ICommunityBBSAdmin.ICreate>(),
    });
  typia.assert(admin);

  // Create search criteria with date range - must be stringified JSON
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = new Date(); // today
  const searchCriteria = JSON.stringify({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Call the endpoint with properly formatted string body per ICommunityBBSReport.IRequest type
  const response: IPageICommunityBBSReport.ISummary =
    await api.functional.communityBBS.admin.reports.index(connection, {
      body: searchCriteria,
    });
  typia.assert(response);

  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
}
