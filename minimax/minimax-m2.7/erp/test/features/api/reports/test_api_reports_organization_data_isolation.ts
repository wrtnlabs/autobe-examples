import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
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
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_reports_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first admin (creates first organization)
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAdmin);
  // 2. Create multiple reports as first admin
  const firstOrgReports: IErpHrmReport[] = [];
  for (let i = 0; i < 2; i++) {
    const report = await generate_random_erp_hrm_admin_reports_create(
      firstAdminConnection,
      {
        body: {
          reportType: RandomGenerator.pick([
            "time_report",
            "project_budget_report",
            "weekly_summary_report",
          ] as const),
          name: `First Org Report ${i + 1}`,
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          groupBy: RandomGenerator.pick([
            "employee",
            "project",
            "task",
          ] as const),
        },
      },
    );
    typia.assert(report);
    firstOrgReports.push(report);
  }
  // 3. Authenticate as second admin (creates second organization)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondAdmin);
  // 4. Create reports as second admin
  const secondOrgReports: IErpHrmReport[] = [];
  for (let i = 0; i < 2; i++) {
    const report = await generate_random_erp_hrm_admin_reports_create(
      secondAdminConnection,
      {
        body: {
          reportType: RandomGenerator.pick([
            "time_report",
            "project_budget_report",
            "weekly_summary_report",
          ] as const),
          name: `Second Org Report ${i + 1}`,
          startDate: "2024-02-01",
          endDate: "2024-02-29",
          groupBy: RandomGenerator.pick([
            "employee",
            "project",
            "task",
          ] as const),
        },
      },
    );
    typia.assert(report);
    secondOrgReports.push(report);
  }
  // 5. List reports as second admin - should see ONLY second org reports
  const secondAdminReportList = await api.functional.erpHrm.admin.reports.index(
    secondAdminConnection,
    {
      body: {} satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(secondAdminReportList);
  // 6. Verify second admin sees only their organization's reports
  TestValidator.equals(
    "second admin sees exactly their reports",
    secondAdminReportList.data.length,
    secondOrgReports.length,
  );
  // Verify none of first org reports are visible to second admin
  for (const firstOrgReport of firstOrgReports) {
    const foundReport = secondAdminReportList.data.find(
      (r) => r.id === firstOrgReport.id,
    );
    TestValidator.equals(
      "first org report NOT visible to second admin",
      foundReport,
      undefined,
    );
  }
  // Verify all second org reports ARE visible
  for (const secondOrgReport of secondOrgReports) {
    const foundReport = secondAdminReportList.data.find(
      (r) => r.id === secondOrgReport.id,
    );
    TestValidator.notEquals(
      "second org report IS visible to second admin",
      foundReport,
      undefined,
    );
  }
  // 7. Verify organization IDs are different
  TestValidator.notEquals(
    "first org ID differs from second org ID",
    firstOrgReports[0].organization.id,
    secondOrgReports[0].organization.id,
  );
  // 8. Verify each report's organization matches its creator
  for (const report of firstOrgReports) {
    TestValidator.equals(
      "first org report belongs to first org",
      report.organization.id,
      firstOrgReports[0].organization.id,
    );
  }
  for (const report of secondOrgReports) {
    TestValidator.equals(
      "second org report belongs to second org",
      report.organization.id,
      secondOrgReports[0].organization.id,
    );
  }
}
