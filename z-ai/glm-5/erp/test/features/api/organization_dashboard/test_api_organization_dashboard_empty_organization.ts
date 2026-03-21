import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account (which creates first organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Get organization dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboards.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate dashboard values for empty organization
  TestValidator.equals(
    "total active employees",
    dashboard.total_active_employees,
    1,
  );
  TestValidator.equals("weekly hours", dashboard.weekly_hours, 0);
  TestValidator.equals("pending approvals", dashboard.pending_approvals, 0);
  TestValidator.equals(
    "budget alerts empty",
    dashboard.budget_alerts.length,
    0,
  );
  TestValidator.equals(
    "top performers empty",
    dashboard.top_performers.length,
    0,
  );
}
