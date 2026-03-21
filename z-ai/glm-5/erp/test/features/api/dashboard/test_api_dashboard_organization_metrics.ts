import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test dashboard organization metrics for owner with report viewing permission.
 *
 * Setup flow:
 * 1. Owner joins organization (gets report:view permission via owner role)
 * 2. Create project with budget hours for utilization tracking
 * 3. Log time entries in current week to generate weekly hours data
 * 4. Retrieve dashboard and validate organization metrics are populated
 *
 * Validates:
 * - Personal dashboard has hours logged and recent timelogs
 * - Organization dashboard is populated (not null) for owner
 * - Organization metrics: active employees count, weekly hours aggregation
 * - Budget alerts and top performers arrays have valid structure
 */
export async function test_api_dashboard_organization_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create project with budget hours for utilization tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#808080",
        budget_hours: 10,
      },
    },
  );
  typia.assert(project);
  // 3. Create timelog entries in current week to generate weekly hours data
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    ownerConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: 480, // 8 hours in minutes
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 4. Retrieve dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(ownerConnection);
  typia.assert(dashboard);
  // 5. Validate personal dashboard metrics
  const expectedHours = timelog.duration / 60; // Convert minutes to hours
  TestValidator.equals(
    "hoursToday matches logged time",
    dashboard.personal.hoursToday,
    expectedHours,
  );
  TestValidator.equals(
    "hoursThisWeek matches logged time",
    dashboard.personal.hoursThisWeek,
    expectedHours,
  );
  TestValidator.predicate(
    "has recent timelogs",
    dashboard.personal.recentTimelogs.length >= 1,
  );
  // 6. Validate organization dashboard is populated (owner has report:view permission)
  TestValidator.predicate(
    "organization dashboard is populated",
    dashboard.organization !== null,
  );
  // 7. Validate organization metrics structure and values
  const orgDashboard = dashboard.organization!;
  TestValidator.predicate(
    "totalActiveEmployees >= 1",
    orgDashboard.total_active_employees >= 1,
  );
  TestValidator.predicate("weeklyHours > 0", orgDashboard.weekly_hours > 0);
  TestValidator.predicate(
    "budgetAlerts is array",
    Array.isArray(orgDashboard.budget_alerts),
  );
  TestValidator.predicate(
    "topPerformers is array",
    Array.isArray(orgDashboard.top_performers),
  );
  // 8. Validate budget alerts have correct structure if any exist
  if (orgDashboard.budget_alerts.length > 0) {
    const alert = orgDashboard.budget_alerts[0];
    typia.assert<IErpHrmOrganizationDashboard.IBudgetAlert>(alert);
    TestValidator.predicate(
      "budget alert utilization <= 100",
      alert.utilization_percentage <= 100,
    );
  }
  // 9. Validate top performers have correct structure if any exist
  if (orgDashboard.top_performers.length > 0) {
    const performer = orgDashboard.top_performers[0];
    typia.assert<IErpHrmOrganizationDashboard.ITopPerformer>(performer);
    TestValidator.predicate(
      "top performer hours logged >= 0",
      performer.hours_logged >= 0,
    );
  }
}
