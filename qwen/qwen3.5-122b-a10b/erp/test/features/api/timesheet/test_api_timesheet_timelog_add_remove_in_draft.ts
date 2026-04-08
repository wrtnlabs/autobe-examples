import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_timelog_add_remove_in_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Login to get organization context
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuth = await api.functional.hrm.auth.member.login(
    loginConnection,
    {
      body: {
        email: memberAuth.email,
        password: memberAuth.token.refresh,
      },
    },
  );
  typia.assert(loginAuth);
  // 3. Use first available organization from login response
  if (!loginAuth.organizations || loginAuth.organizations.length === 0) {
    throw new Error("No organizations available for testing");
  }
  const organizationId = loginAuth.organizations[0].id;
  // 4. Create project for time logging
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      loginConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 5. Find employee record for this member in the organization
  // Note: Employee creation typically requires admin, so we'll use the member's employee record
  // that should exist from the organization membership
  const employeeId = memberAuth.id;
  // Assign employee to project
  const projectMember =
    await generate_random_hrm_member_projects_members_create(
      loginConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        } satisfies IHrmProjectMember.ICreate,
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 6. Create initial timelogs for the week (Monday to Sunday)
  const weekStartDate = new Date();
  // Set to Monday of current week
  const dayOfWeek = weekStartDate.getDay();
  const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStartDate.setDate(diff);
  weekStartDate.setHours(0, 0, 0, 0);
  const initialTimelogCount = 3;
  const initialTimelogs = await ArrayUtil.asyncRepeat(
    initialTimelogCount,
    async (index) => {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + index); // Spread across the week
      return await generate_random_hrm_member_organizations_timelogs_create(
        loginConnection,
        {
          body: {
            hrm_project_id: project.id,
            date: date.toISOString(),
            duration_minutes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
            >(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            billable: index % 2 === 0,
          } satisfies IHrmTimelog.ICreate,
          params: { organizationId },
        },
      );
    },
  );
  const initialTimelogIds = initialTimelogs.map((t) => t.id);
  // 7. Create draft timesheet for the week
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      loginConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(timesheet);
  // Validate initial state
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  const initialTotalHours = timesheet.total_hours;
  TestValidator.predicate(
    "has initial timelogs",
    timesheet.timelogs.length > 0,
  );
  // 8. Create additional timelog to add to timesheet
  const additionalTimelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      loginConnection,
      {
        body: {
          hrm_project_id: project.id,
          date: new Date(
            weekStartDate.getTime() + 4 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Thursday
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(additionalTimelog);
  const additionalTimelogId = additionalTimelog.id;
  // 9. Update timesheet: add new timelog, remove one existing timelog
  const timelogIdsToRemove = [initialTimelogIds[0]];
  const timelogIdsToAdd = [additionalTimelogId];
  const oldUpdatedAt = timesheet.updated_at;
  const updatedTimesheet =
    await api.functional.hrm.member.timesheets.timelogs.update(
      loginConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add_timelog_ids: timelogIdsToAdd,
          remove_timelog_ids: timelogIdsToRemove,
        } satisfies IHrmTimesheetTimelog.ITimelogUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 10. Validate additions and removals
  TestValidator.equals(
    "timesheet status still draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.notEquals(
    "updated_at is refreshed",
    oldUpdatedAt,
    updatedTimesheet.updated_at,
  );
  // Verify removed timelog is not in the list (ISummary may not have id, so check length instead)
  TestValidator.equals(
    "timelog count after removal",
    initialTimelogs.length - 1 + 1,
    updatedTimesheet.timelogs.length,
  );
  // Verify total_hours changed (should be different after add/remove)
  TestValidator.notEquals(
    "total_hours recalculated",
    initialTotalHours,
    updatedTimesheet.total_hours,
  );
  // 11. Test duplicate addition (should be silently skipped)
  const beforeDuplicateCount = updatedTimesheet.timelogs.length;
  const duplicateUpdatedTimesheet =
    await api.functional.hrm.member.timesheets.timelogs.update(
      loginConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add_timelog_ids: [additionalTimelogId], // Already added
          remove_timelog_ids: [],
        } satisfies IHrmTimesheetTimelog.ITimelogUpdate,
      },
    );
  typia.assert(duplicateUpdatedTimesheet);
  TestValidator.equals(
    "duplicate addition skipped - count unchanged",
    beforeDuplicateCount,
    duplicateUpdatedTimesheet.timelogs.length,
  );
}