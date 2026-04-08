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
import { generate_random_erp_hrm_admin_reports_parameters_create } from "../../../generate/generate_random_erp_hrm_admin_reports_parameters_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_parameter_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin1 and set up report with parameters in organization 1
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Generate date strings for report date range
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startDateStr = today.toISOString().split("T")[0];
  const endDateStr = nextWeek.toISOString().split("T")[0];
  // Create a report in organization 1
  const report = await generate_random_erp_hrm_admin_reports_create(
    admin1Connection,
    {
      body: {
        reportType: "time_report",
        name: RandomGenerator.name(),
        startDate: startDateStr,
        endDate: endDateStr,
        groupBy: "employee",
      },
    },
  );
  typia.assert(report);
  // Create parameters for the report in organization 1
  const parameter =
    await generate_random_erp_hrm_admin_reports_parameters_create(
      admin1Connection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          groupBy: "employee",
        },
      },
    );
  typia.assert(parameter);
  // Step 2: Create admin2 (creates a different organization)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 3: Attempt to access the parameter from org1 using admin2's connection
  // This should return 404 due to organization isolation
  await TestValidator.httpError(
    "Accessing parameter from different organization should return 404",
    404,
    async () => {
      await api.functional.erpHrm.admin.reports.parameters.at(
        admin2Connection,
        {
          reportId: report.id,
          parameterId: parameter.id,
        },
      );
    },
  );
}
