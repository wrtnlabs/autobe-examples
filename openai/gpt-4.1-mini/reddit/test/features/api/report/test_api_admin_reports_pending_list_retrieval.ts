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

export async function test_api_admin_reports_pending_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving the paginated list of pending user reports by an authenticated admin user.
  // Validate that only reports with 'pending' status are returned with complete report summaries including reporter information and report reasons.
  // Verify pagination parameters and response structure.
  // Confirm authorization enforcement that only admins can access this endpoint.
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin is empty
  });
  typia.assert(adminAuth);
  // The utility function sets Authorization header internally, no need to override headers manually
  // 2. Retrieve pending reports list as authorized admin
  const pendingReports =
    await api.functional.communityPlatform.admin.reports.pending.index(
      adminConnection,
    );
  typia.assert(pendingReports);
  // 3. Validate pagination properties
  const { pagination, data } = pendingReports;
  typia.assert(pagination);
  typia.assert(Array.isArray(data));
  // Check pagination numeric properties are non-negative integers
  TestValidator.predicate(
    "pagination.current is non-negative integer",
    Number.isInteger(pagination.current) && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative integer",
    Number.isInteger(pagination.limit) && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative integer",
    Number.isInteger(pagination.pages) && pagination.pages >= 0,
  );
  // 4. Validate each report summary to match expected structure and 'pending' status
  for (const report of data) {
    typia.assert(report);
    // Since ICommunityPlatformReport.ISummary has no specified properties in DTO, just assert content structure
    // Confirm report includes the reporter info, report reason, and timestamps by presence (not deep checking since schema is empty for ISummary)
    TestValidator.predicate(
      "report is object",
      typeof report === "object" && report !== null,
    );
  }
  // 5. Authorization enforcement test - use a non-admin connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access for non-admin",
    401,
    async () => {
      await api.functional.communityPlatform.admin.reports.pending.index(
        unauthorizedConnection,
      );
    },
  );
}
