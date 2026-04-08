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
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_parameters_upsert_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a report without full parameter configuration
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report);
  // 3. Add filter parameters for the first time via PATCH (upsert behavior)
  const initialDate = new Date("2024-02-01").toISOString();
  const endDate = new Date("2024-02-28").toISOString();
  const updatedReport =
    await api.functional.erpHrm.admin.reports.parameters.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          startDate: initialDate,
          endDate: endDate,
          groupBy: "task",
          billable: false,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate parameters were created and associated with the report
  TestValidator.equals("report ID preserved", updatedReport.id, report.id);
  TestValidator.equals(
    "start_date updated",
    updatedReport.parameter.start_date,
    initialDate,
  );
  TestValidator.equals(
    "end_date updated",
    updatedReport.parameter.end_date,
    endDate,
  );
  TestValidator.equals(
    "group_by is task",
    updatedReport.parameter.group_by,
    "task",
  );
  TestValidator.equals(
    "billable is false",
    updatedReport.parameter.billable,
    false,
  );
  // 5. Partial update - change only billable to true while keeping other values
  const partiallyUpdatedReport =
    await api.functional.erpHrm.admin.reports.parameters.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          billable: true,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(partiallyUpdatedReport);
  // 6. Validate partial update preserved other values and changed billable
  TestValidator.equals(
    "start_date preserved",
    partiallyUpdatedReport.parameter.start_date,
    initialDate,
  );
  TestValidator.equals(
    "end_date preserved",
    partiallyUpdatedReport.parameter.end_date,
    endDate,
  );
  TestValidator.equals(
    "group_by preserved",
    partiallyUpdatedReport.parameter.group_by,
    "task",
  );
  TestValidator.equals(
    "billable changed to true",
    partiallyUpdatedReport.parameter.billable,
    true,
  );
}
