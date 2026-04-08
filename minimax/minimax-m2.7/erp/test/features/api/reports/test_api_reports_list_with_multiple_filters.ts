import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reports_list_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Fetch all reports (no filters)
  const allReportsResult = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(allReportsResult);
  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    allReportsResult.pagination !== undefined,
  );
  TestValidator.equals("page is 1", allReportsResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    allReportsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    allReportsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    allReportsResult.pagination.pages >= 0,
  );
  // Verify each report has organization and generatedByMember summaries
  for (const report of allReportsResult.data) {
    typia.assert(report);
    TestValidator.predicate(
      "report has organization summary",
      report.organization !== undefined && report.organization !== null,
    );
    TestValidator.predicate(
      "report has generatedByMember summary",
      report.generatedByMember !== undefined &&
        report.generatedByMember !== null,
    );
  }
  // 3. Filter by reportType = "time_report"
  const timeReportResult = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        reportType: "time_report",
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(timeReportResult);
  for (const report of timeReportResult.data) {
    TestValidator.equals(
      "report type is time_report",
      report.reportType,
      "time_report",
    );
  }
  // 4. Filter by date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const dateRangeResult = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        startDate: startDate.toISOString() as string & tags.Format<"date-time">,
        endDate: endDate.toISOString() as string & tags.Format<"date-time">,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  for (const report of dateRangeResult.data) {
    const reportDate = new Date(report.createdAt);
    TestValidator.predicate(
      "report date is within range",
      reportDate >= startDate && reportDate <= endDate,
    );
  }
  // 5. Filter by generatorId
  if (allReportsResult.data.length > 0) {
    const generatorId = allReportsResult.data[0].generatedByMember.id;
    const generatorResult = await api.functional.erpHrm.admin.reports.index(
      adminConnection,
      {
        body: {
          generatorId: generatorId,
        } satisfies IErpHrmReport.IRequest,
      },
    );
    typia.assert(generatorResult);
    for (const report of generatorResult.data) {
      TestValidator.equals(
        "report generator matches filter",
        report.generatedByMember.id,
        generatorId,
      );
    }
  }
  // 6. Combined filter - reportType + date range
  const combinedResult = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        reportType: "project_budget_report",
        startDate: startDate.toISOString() as string & tags.Format<"date-time">,
        endDate: endDate.toISOString() as string & tags.Format<"date-time">,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(combinedResult);
  for (const report of combinedResult.data) {
    TestValidator.equals(
      "report type is project_budget_report",
      report.reportType,
      "project_budget_report",
    );
    const reportDate = new Date(report.createdAt);
    TestValidator.predicate(
      "report date is within range",
      reportDate >= startDate && reportDate <= endDate,
    );
  }
  // 7. Test pagination parameters
  const paginatedResult = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "limit matches request",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedResult.data.length <= 5,
  );
}
