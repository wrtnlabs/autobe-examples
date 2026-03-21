import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_types_retrieval_with_all_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member by creating a new account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve available report types for the organization
  // Using a valid UUID format for organizationId
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const reportTypes =
    await api.functional.erpHrm.member.organizations.reports.types.listTypes(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(reportTypes);
  // 3. Validate response structure - IErpHrmReport contains:
  // - id: UUID of the report type entry
  // - report_type: string identifier (time_report, project_budget_report, weekly_summary_report)
  // - name: optional display name
  // - created_at: timestamp
  // - updated_at: timestamp
  // - organization: IErpHrmOrganization.ISummary
  // - generatedByMember: IErpHrmMember.ISummary
  // - parameter: IErpHrmReportParameter
  TestValidator.equals("id is valid UUID format", reportTypes.id.length, 36);
  TestValidator.predicate(
    "report_type is string",
    typeof reportTypes.report_type === "string",
  );
  TestValidator.predicate(
    "created_at exists",
    (
      reportTypes as {
        created_at?: string;
      }
    ).created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    (
      reportTypes as {
        updated_at?: string;
      }
    ).updated_at !== undefined,
  );
  TestValidator.predicate(
    "organization exists",
    reportTypes.organization !== undefined,
  );
  TestValidator.predicate(
    "generatedByMember exists",
    reportTypes.generatedByMember !== undefined,
  );
  TestValidator.predicate(
    "parameter exists",
    reportTypes.parameter !== undefined,
  );
  // 4. Validate report_type is one of the predefined types
  const validReportTypes = [
    "time_report",
    "project_budget_report",
    "weekly_summary_report",
  ];
  TestValidator.equals(
    "report_type is one of valid types",
    validReportTypes.includes(reportTypes.report_type),
    true,
  );
}
