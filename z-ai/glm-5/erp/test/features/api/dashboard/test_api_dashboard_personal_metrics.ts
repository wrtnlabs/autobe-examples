import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_personal_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member (creates first organization with owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Get dashboard data
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 3. Validate personal section exists
  typia.assert(dashboard.personal);
  // 4. Validate personal metrics (initial state after joining)
  TestValidator.equals("hours today is zero", dashboard.personal.hoursToday, 0);
  TestValidator.equals(
    "hours this week is zero",
    dashboard.personal.hoursThisWeek,
    0,
  );
  TestValidator.equals(
    "active timer is null",
    dashboard.personal.activeTimer,
    null,
  );
  TestValidator.equals(
    "recent timelogs is empty",
    dashboard.personal.recentTimelogs.length,
    0,
  );
  TestValidator.equals(
    "pending timesheet is null",
    dashboard.personal.pendingTimesheet,
    null,
  );
  TestValidator.equals(
    "assigned tasks is empty",
    dashboard.personal.assignedTasks.length,
    0,
  );
  // 5. For Owner role (created by authorize_member_join), organization section is populated
  // Owner has report:view permission, so organization metrics are available
  const organization = typia.assert(dashboard.organization!);
  TestValidator.equals(
    "total active employees is one",
    organization.total_active_employees,
    1,
  );
  TestValidator.equals("weekly hours is zero", organization.weekly_hours, 0);
  TestValidator.equals(
    "pending approvals is zero",
    organization.pending_approvals,
    0,
  );
  TestValidator.equals(
    "budget alerts is empty",
    organization.budget_alerts.length,
    0,
  );
  TestValidator.equals(
    "top performers is empty",
    organization.top_performers.length,
    0,
  );
}
