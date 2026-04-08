import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_update_grouping_preference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 2. Create initial report grouped by employee
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  const initialReport = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        name: "Initial Group by Employee Report",
        startDate: startDate.toISOString().split("T")[0] ?? "",
        endDate: endDate.toISOString().split("T")[0] ?? "",
        groupBy: "employee",
      },
    },
  );
  typia.assert(initialReport);
  // Validate initial report has group_by = "employee"
  TestValidator.equals(
    "initial report group_by is employee",
    initialReport.parameter.group_by,
    "employee",
  );
  // 3. Send PUT request to change group_by to 'project'
  const updatedReportToProject =
    await api.functional.erpHrm.admin.reports.update(adminConnection, {
      reportId: initialReport.id,
      body: {
        parameter: {
          groupBy: "project",
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    });
  typia.assert(updatedReportToProject);
  // 4. Validate response shows updated group_by = "project"
  TestValidator.equals(
    "updated report group_by is project",
    updatedReportToProject.parameter.group_by,
    "project",
  );
  // 5. Send PUT request to change group_by to 'task'
  const updatedReportToTask = await api.functional.erpHrm.admin.reports.update(
    adminConnection,
    {
      reportId: initialReport.id,
      body: {
        parameter: {
          groupBy: "task",
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    },
  );
  typia.assert(updatedReportToTask);
  // 6. Validate group_by reflects the new preference = "task"
  TestValidator.equals(
    "updated report group_by is task",
    updatedReportToTask.parameter.group_by,
    "task",
  );
}
