import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDashboard";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";

export async function test_api_member_dashboard_overview_aggregated_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const org = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org);
  // Select organization context
  await api.functional.hrmTracker.member.organizations.index(memberConnection, {
    body: {
      name: org.name,
    } satisfies IHrmTrackerOrganization.IRequest,
  });
  // 3. Create employees
  const employees = await Promise.all(
    ArrayUtil.repeat(4, async () => {
      const employmentType = RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const);
      const status = RandomGenerator.pick(["active", "deactivated"] as const);
      return await generate_random_hrm_tracker_member_employees_create(
        memberConnection,
        {
          body: {
            employment_type: employmentType,
            status: status,
            position: RandomGenerator.paragraph({ sentences: 1 }) || null,
            department_id: null,
            role_id: null,
            organization_id: org.id,
            user_id: member.id,
          } satisfies IHrmTrackerEmployee.ICreate,
        },
      );
    }),
  );
  typia.assert(employees);
  // 4. Create projects with different statuses
  const activeProject =
    await generate_random_hrm_tracker_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(2),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmTrackerProject.ICreate,
    });
  typia.assert(activeProject);
  const completedProject =
    await generate_random_hrm_tracker_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(2),
        color: "#33C1FF",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmTrackerProject.ICreate,
    });
  typia.assert(completedProject);
  const archivedProject =
    await generate_random_hrm_tracker_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(2),
        color: "#FFC300",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmTrackerProject.ICreate,
    });
  typia.assert(archivedProject);
  // 5. Create timesheets - create draft timesheets, then submit some
  const today = new Date();
  const lastWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekEnd = new Date(
    lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1,
  );
  // Create draft timesheets
  const draftTimesheets = await Promise.all(
    ArrayUtil.repeat(3, async (i) => {
      return await api.functional.hrmTracker.member.timesheets.create(
        memberConnection,
        {
          body: {
            timesheet_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmTrackerTimesheet.ISubmit,
        },
      );
    }),
  );
  typia.assert(draftTimesheets);
  // 6. Submit one timesheet
  const submittedTimesheet =
    await api.functional.hrmTracker.member.timesheets.create(memberConnection, {
      body: {
        timesheet_id: draftTimesheets[0].id,
      } satisfies IHrmTrackerTimesheet.ISubmit,
    });
  typia.assert(submittedTimesheet);
  // 7. Retrieve dashboard overview
  const overview =
    await api.functional.hrmTracker.member.organizations.dashboard.overview.at(
      memberConnection,
      {
        organizationId: org.id,
      },
    );
  typia.assert(overview);
  // 8. Validate metrics
  TestValidator.equals(
    "employee count",
    overview.employeeCount,
    employees.length,
  );
  TestValidator.equals("project total count", overview.projectStats.total, 3);
  TestValidator.equals("project active count", overview.projectStats.active, 1);
  TestValidator.equals(
    "project completed count",
    overview.projectStats.completed,
    1,
  );
  TestValidator.equals(
    "project archived count",
    overview.projectStats.archived,
    1,
  );
  TestValidator.equals(
    "timesheet submitted count",
    overview.timesheetSummary.submitted,
    1,
  );
  TestValidator.predicate(
    "recent activities limit",
    overview.recentActivities.length <= 10,
  );
}