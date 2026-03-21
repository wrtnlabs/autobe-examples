import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_parameters_partial_update_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // Step 2: Get organizationId from the authorized admin's context
  // For E2E tests, we need to create a report within an organization
  // Using generation function with predefined body for initial parameters
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          report_type: "time_report",
          parameter: {
            group_by: "task" as const,
            billable: false,
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-01-31T23:59:59Z",
          },
        },
      },
    );
  typia.assert(report);
  // Step 3: Update only the date range fields via PUT
  const updatedParameter =
    await api.functional.erpHrm.admin.organizations.reports.parameters.update(
      adminConnection,
      {
        organizationId: report.organization.id,
        reportId: report.id,
        body: {
          start_date: "2024-03-01T00:00:00Z",
          end_date: "2024-03-31T23:59:59Z",
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // Step 4: Validate that unchanged fields retain their original values
  TestValidator.equals(
    "group_by should remain 'task'",
    updatedParameter.group_by,
    "task",
  );
  TestValidator.equals(
    "billable should remain false",
    updatedParameter.billable,
    false,
  );
  // Step 5: Validate that updated fields reflect new dates
  TestValidator.equals(
    "start_date updated",
    updatedParameter.start_date,
    "2024-03-01T00:00:00Z",
  );
  TestValidator.equals(
    "end_date updated",
    updatedParameter.end_date,
    "2024-03-31T23:59:59Z",
  );
}
