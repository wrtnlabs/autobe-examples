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

export async function test_api_report_retrieval_without_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Test that an admin user without the report:view permission is denied access when attempting to retrieve a report.
  // Step 1: Authenticate as first admin
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAdmin);
  // Step 2: Create a report within the organization via the first admin
  // We need an organization ID - create a report with organization creation handled by the generation function
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      firstAdminConnection,
      {
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(report);
  const organizationId = report.organization.id;
  const reportId = report.id;
  // Step 3: Verify the report was successfully created
  TestValidator.equals("report created", report.id, reportId);
  // Step 4: Authenticate as second admin (without report:view permission)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword456!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondAdmin);
  // Step 5: Attempt to retrieve the report using the second admin's JWT token
  // Step 6: Verify HTTP 403 Forbidden response indicating insufficient permissions
  await TestValidator.httpError(
    "second admin without report:view permission denied access",
    403,
    async () =>
      await api.functional.erpHrm.admin.organizations.reports.at(
        secondAdminConnection,
        {
          organizationId: organizationId,
          reportId: reportId,
        },
      ),
  );
  // Step 7: Confirm the second admin cannot access the report despite being authenticated
  // (Verified by HTTP 403 response above)
}
