import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_organization_dashboard_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create fresh organization with admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve organization dashboard (no data exists yet)
  const dashboard =
    await api.functional.erpHrm.admin.dashboard.organization.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all metrics are zero or empty for new organization
  TestValidator.equals("employeeCount equals 0", dashboard.employeeCount, 0);
  TestValidator.equals(
    "totalHoursThisWeek equals 0",
    dashboard.totalHoursThisWeek,
    0,
  );
  TestValidator.equals(
    "pendingTimesheetsCount equals 0",
    dashboard.pendingTimesheetsCount,
    0,
  );
  TestValidator.equals(
    "budgetAlertProjects is empty",
    dashboard.budgetAlertProjects.length,
    0,
  );
  TestValidator.equals(
    "topPerformers is empty",
    dashboard.topPerformers.length,
    0,
  );
}
