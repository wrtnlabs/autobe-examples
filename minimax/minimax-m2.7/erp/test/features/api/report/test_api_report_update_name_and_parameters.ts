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

export async function test_api_report_update_name_and_parameters(
  connection: api.IConnection,
): Promise<void> {
  // Test successful update of an existing report's display name and filter parameters
  // 1. Admin authenticates via join
  // 2. Create organization (establishes context)
  // 3. Generate initial report with time_report type and parameters
  // 4. Send PUT request to update report name to 'Updated Monthly Report' and change date range
  // 5. Validate response returns updated report with new name and modified parameters
  // 6. Verify report_type remains unchanged (immutable)
  // 7. Verify generated_by tracking preserved
  // 1. Admin authenticates via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create organization to establish organization context
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create initial report with time_report type
  const initialReport = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        name: "Initial Report",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        groupBy: "employee",
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(initialReport);
  // 4. Send PUT request to update report name and parameters
  const newStartDate = "2026-02-01T00:00:00.000Z";
  const newEndDate = "2026-02-28T23:59:59.999Z";
  const updatedReport = await api.functional.erpHrm.admin.reports.update(
    adminConnection,
    {
      reportId: initialReport.id,
      body: {
        name: "Updated Monthly Report",
        parameter: {
          startDate: newStartDate,
          endDate: newEndDate,
          billable: true,
        } satisfies IErpHrmReportParameter.IUpdate,
      } satisfies IErpHrmReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 5. Validate response returns updated report
  TestValidator.equals(
    "report ID preserved",
    updatedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "name updated",
    updatedReport.name,
    "Updated Monthly Report",
  );
  TestValidator.equals(
    "report_type unchanged",
    updatedReport.reportType,
    "time_report",
  );
  // 6. Verify generated_by tracking preserved
  TestValidator.equals(
    "generated_by preserved",
    updatedReport.generatedByMember.id,
    admin.id,
  );
  // 7. Verify parameter dates were updated
  TestValidator.equals(
    "parameter start_date updated",
    updatedReport.parameter.start_date,
    newStartDate,
  );
  TestValidator.equals(
    "parameter end_date updated",
    updatedReport.parameter.end_date,
    newEndDate,
  );
}
