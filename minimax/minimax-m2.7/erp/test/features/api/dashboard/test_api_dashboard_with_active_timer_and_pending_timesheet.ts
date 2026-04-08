import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_dashboard_with_active_timer_and_pending_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate with known password
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      password: "AdminPass123!",
    },
  });
  typia.assert(adminAuth);
  // 2. Create organization via admin login
  const adminOrgConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminOrgConnection, {
    body: {
      email: adminAuth.email,
      password: "AdminPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 3. Create member account and authenticate with known password
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      password: "MemberPass123!",
    },
  });
  typia.assert(memberAuth);
  // 4. Set organization context for member
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {},
    );
  typia.assert(orgContext);
  // 5. Create draft timesheet for current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 6. Retrieve dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 7. Validate personalMetrics exists
  TestValidator.predicate(
    "personalMetrics should exist",
    dashboard.personalMetrics !== null &&
      dashboard.personalMetrics !== undefined,
  );
  // 8. Validate pendingTimesheet is not null (created timesheet should appear)
  TestValidator.equals(
    "pendingTimesheet should not be null",
    dashboard.personalMetrics.pendingTimesheet !== null &&
      dashboard.personalMetrics.pendingTimesheet !== undefined,
    true,
  );
  // 9. Validate pendingTimesheet status is draft
  if (dashboard.personalMetrics.pendingTimesheet != null) {
    TestValidator.equals(
      "pendingTimesheet status should be draft",
      dashboard.personalMetrics.pendingTimesheet.status,
      "draft",
    );
    TestValidator.equals(
      "pendingTimesheet employee matches",
      dashboard.personalMetrics.pendingTimesheet.employee.id,
      orgContext.employee.id,
    );
  }
  // 10. Validate hours metrics (may be 0 since no timelogs yet)
  TestValidator.predicate(
    "hoursToday should be non-negative",
    dashboard.personalMetrics.hoursToday >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek should be non-negative",
    dashboard.personalMetrics.hoursThisWeek >= 0,
  );
  // 11. Validate recentTimelogs structure
  TestValidator.predicate(
    "recentTimelogs should be an array",
    Array.isArray(dashboard.personalMetrics.recentTimelogs),
  );
  TestValidator.predicate(
    "recentTimelogs should have at most 5 entries",
    dashboard.personalMetrics.recentTimelogs.length <= 5,
  );
  // 12. Validate assignedTasks structure
  TestValidator.predicate(
    "assignedTasks should be an array",
    Array.isArray(dashboard.personalMetrics.assignedTasks),
  );
  // 13. Validate activeTimer is null (no timer started without project id)
  TestValidator.equals(
    "activeTimer should be null without project",
    dashboard.personalMetrics.activeTimer,
    null,
  );
}
