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

export async function test_api_report_types_organization_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to establish a session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Get organization ID from the authorized session context
  // When a member joins, they should have organization context available
  // The system enforces data isolation between organizations
  const organizationId =
    authorized.activeTimers?.[0]?.project?.organization?.id;
  // 3. Call the report types endpoint with the organization ID
  // The endpoint returns report types scoped to the specified organization
  const reportTypes =
    await api.functional.erpHrm.member.organizations.reports.types.listTypes(
      memberConnection,
      {
        organizationId:
          organizationId ?? typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // 4. Validate the response using typia.assert for complete runtime type validation
  typia.assert(reportTypes);
  // 5. Verify report types are properly scoped to the organization context
  // Report types should contain valid type identifiers and organization context
  TestValidator.predicate("report has valid type", !!reportTypes.report_type);
  TestValidator.equals(
    "report type is valid string",
    typeof reportTypes.report_type,
    "string",
  );
  TestValidator.predicate(
    "report has organization context",
    !!reportTypes.organization,
  );
  TestValidator.equals(
    "organization matches requested context",
    reportTypes.organization.id,
    organizationId,
  );
}
