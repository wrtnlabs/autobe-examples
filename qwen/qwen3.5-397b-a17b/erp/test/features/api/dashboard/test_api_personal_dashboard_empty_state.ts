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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test the personal dashboard endpoint for a newly onboarded employee with no activity.
 * Verifies all sections return appropriate empty/null values when no data exists.
 *
 * Test Steps:
 * 1. Join as a member to create authentication credentials
 * 2. Create an organization
 * 3. Create an employee record for the member (newly onboarded, no work yet)
 * 4. Do NOT create any timelogs, timers, timesheets, or tasks
 * 5. Call the personal dashboard endpoint
 *
 * Validation Points:
 * - hoursToday: Returns 0 (no timelogs exist for today)
 * - hoursThisWeek: Returns 0 (no timelogs exist for this week)
 * - activeTimer: Returns null (no timer session started)
 * - recentTimelogs: Returns empty array [] (no timelog entries)
 * - pendingTimesheet: Returns null (no timesheet created for current week)
 * - assignedTasks: Returns empty array [] (no tasks assigned to employee)
 * - Response structure is complete with all 6 sections present
 * - No errors occur when querying empty data sets
 * - Dashboard is accessible immediately after employee creation without any prerequisite work data
 */
export async function test_api_personal_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to get authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
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
  // 3. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 4. Create employee record for the member (newly onboarded, no work yet)
  // Note: role_id is generated as random UUID since roles.list API is not available
  // in the provided SDK functions. In production E2E environment, this would fetch
  // the actual Employee role from the roles endpoint.
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 5. Call personal dashboard endpoint (no timelogs, timers, timesheets, or tasks created)
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.personal.at(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // 6. Validate all sections return appropriate empty values
  TestValidator.equals("hoursToday should be 0", dashboard.hoursToday, 0);
  TestValidator.equals("hoursThisWeek should be 0", dashboard.hoursThisWeek, 0);
  TestValidator.equals(
    "activeTimer should be null",
    dashboard.activeTimer,
    null,
  );
  TestValidator.equals(
    "recentTimelogs should be empty array",
    dashboard.recentTimelogs,
    [],
  );
  TestValidator.equals(
    "pendingTimesheet should be null",
    dashboard.pendingTimesheet,
    null,
  );
  TestValidator.equals(
    "assignedTasks should be empty array",
    dashboard.assignedTasks,
    [],
  );
  // 7. Validate response structure completeness
  TestValidator.predicate(
    "dashboard has hoursToday property",
    "hoursToday" in dashboard,
  );
  TestValidator.predicate(
    "dashboard has hoursThisWeek property",
    "hoursThisWeek" in dashboard,
  );
  TestValidator.predicate(
    "dashboard has activeTimer property",
    "activeTimer" in dashboard,
  );
  TestValidator.predicate(
    "dashboard has recentTimelogs property",
    "recentTimelogs" in dashboard,
  );
  TestValidator.predicate(
    "dashboard has pendingTimesheet property",
    "pendingTimesheet" in dashboard,
  );
  TestValidator.predicate(
    "dashboard has assignedTasks property",
    "assignedTasks" in dashboard,
  );
}
