import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that the organization dashboard returns zero or empty values for all metrics when no data exists in the organization.
 *
 * Validates the contract that dashboard metrics never return null — instead returning zero-valued numbers and empty arrays when the organization has no employees, timelogs, timesheets, or projects. This ensures the client can safely render the dashboard without null checks.
 *
 * 1. A new member joins to establish session and organization context.
 * 2. The organization dashboard endpoint is called for the newly joined member.
 * 3. All five metrics are validated: active_employee_count is 0, total_hours_this_week is 0, pending_timesheets_count is 0, projects_over_budget is an empty array, and top_employees is an empty array.
 */
export async function test_api_organization_dashboard_empty_metrics(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const dashboard =
    await api.functional.erpHrm.member.dashboard.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  TestValidator.equals(
    "active_employee_count",
    dashboard.active_employee_count,
    0,
  );
  TestValidator.equals(
    "total_hours_this_week",
    dashboard.total_hours_this_week,
    0,
  );
  TestValidator.equals(
    "pending_timesheets_count",
    dashboard.pending_timesheets_count,
    0,
  );
  TestValidator.predicate(
    "projects_over_budget is empty",
    dashboard.projects_over_budget.length === 0,
  );
  TestValidator.predicate(
    "top_employees is empty",
    dashboard.top_employees.length === 0,
  );
}
