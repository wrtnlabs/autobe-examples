import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_dashboard_employee_personal_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create organization using utility function
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 4. Select organization context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 5. Verify employee record exists (member is auto-created as employee)
  const employeeList = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employeeList);
  TestValidator.predicate(
    "employee exists",
    () => employeeList.data.length > 0,
  );
  const employee = employeeList.data[0];
  typia.assert(employee);
  // 6. Call dashboard endpoint to get personal metrics
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 7. Validate personal section structure and data types
  TestValidator.predicate(
    "personal section exists",
    () => dashboard.personal !== undefined,
  );
  // Validate hoursToday is a non-negative number
  TestValidator.predicate(
    "hoursToday is number",
    () => typeof dashboard.personal.hoursToday === "number",
  );
  TestValidator.predicate(
    "hoursToday is non-negative",
    () => dashboard.personal.hoursToday >= 0,
  );
  // Validate hoursThisWeek is a non-negative number
  TestValidator.predicate(
    "hoursThisWeek is number",
    () => typeof dashboard.personal.hoursThisWeek === "number",
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative",
    () => dashboard.personal.hoursThisWeek >= 0,
  );
  // Validate activeTimer is null (no timer running) or valid timer object
  TestValidator.predicate(
    "activeTimer is null or object",
    () =>
      dashboard.personal.activeTimer === null ||
      typeof dashboard.personal.activeTimer === "object",
  );
  // Validate recentTimelogs is an array with maximum 5 entries
  TestValidator.predicate("recentTimelogs is array", () =>
    Array.isArray(dashboard.personal.recentTimelogs),
  );
  TestValidator.predicate(
    "recentTimelogs max 5 entries",
    () => dashboard.personal.recentTimelogs.length <= 5,
  );
  // Validate timesheetStatus is one of the allowed enum values
  TestValidator.predicate("timesheetStatus is valid", () =>
    ["none", "draft", "submitted", "approved", "rejected"].includes(
      dashboard.personal.timesheetStatus,
    ),
  );
  // Validate assignedTasks is an array
  TestValidator.predicate("assignedTasks is array", () =>
    Array.isArray(dashboard.personal.assignedTasks),
  );
  // 8. Validate organization section is null for standard employee without report:view permission
  TestValidator.equals(
    "organization is null for standard employee",
    dashboard.organization,
    null,
  );
}
