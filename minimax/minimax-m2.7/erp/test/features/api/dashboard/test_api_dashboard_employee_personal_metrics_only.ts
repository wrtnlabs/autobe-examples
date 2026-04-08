import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_dashboard_employee_personal_metrics_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Set organization context (creates organization and employee automatically)
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {},
    );
  typia.assert(orgContext);
  // 3. Retrieve dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 4. Verify personalMetrics is always present for authenticated users
  const personalMetrics = dashboard.personalMetrics;
  TestValidator.predicate(
    "personalMetrics exists",
    personalMetrics !== null && personalMetrics !== undefined,
  );
  // 5. Validate personalMetrics structure
  const pm = dashboard.personalMetrics;
  // hoursToday and hoursThisWeek are integers (can be 0 for new users)
  TestValidator.predicate(
    "hoursToday is integer",
    Number.isInteger(pm.hoursToday),
  );
  TestValidator.predicate(
    "hoursThisWeek is integer",
    Number.isInteger(pm.hoursThisWeek),
  );
  TestValidator.predicate("hoursToday non-negative", pm.hoursToday >= 0);
  TestValidator.predicate("hoursThisWeek non-negative", pm.hoursThisWeek >= 0);
  // activeTimer is null when no timer is running
  TestValidator.predicate(
    "activeTimer is null when no timer running",
    pm.activeTimer === null,
  );
  // recentTimelogs is an array (can be empty)
  TestValidator.predicate(
    "recentTimelogs is array",
    Array.isArray(pm.recentTimelogs),
  );
  // pendingTimesheet can be null when no timesheet exists
  TestValidator.predicate(
    "pendingTimesheet can be null",
    pm.pendingTimesheet === null || pm.pendingTimesheet === undefined,
  );
  // assignedTasks is an array (can be empty)
  TestValidator.predicate(
    "assignedTasks is array",
    Array.isArray(pm.assignedTasks),
  );
  // 6. Verify organizationalMetrics is null/undefined for regular employees
  // (regular Employee role does not have report:view permission)
  TestValidator.equals(
    "organizationalMetrics null for no report:view permission",
    dashboard.organizationalMetrics,
    null,
  );
}
