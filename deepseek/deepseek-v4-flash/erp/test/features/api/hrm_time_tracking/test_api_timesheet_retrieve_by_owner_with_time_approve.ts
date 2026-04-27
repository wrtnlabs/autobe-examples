import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_retrieve_by_owner_with_time_approve(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as member A (employee who will create and submit timesheets)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // Step 2: Join as member B (organization owner with time:approve permission)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // Step 3: Create organization as member B
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberBConnection,
      {},
    );
  typia.assert(organization);
  // Step 4: Create a project as member B within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberBConnection,
      {},
    );
  typia.assert(project);
  // Step 5: Add member A's employee as a project member
  const memberAEmployeeId = memberA.employees[0].id;
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberBConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAEmployeeId,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: Compute the current work week (Monday) for timesheet
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
  const weekStartDate = monday.toISOString().split("T")[0]!;
  // Step 7: Create a timelog for member A within the work week (Tuesday)
  const timelogDate = new Date(monday.getTime() + 24 * 60 * 60 * 1000);
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberAConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
          >(),
        },
      },
    );
  typia.assert(timelog);
  // Step 8: Create a draft timesheet for member A for the current work week
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberAConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // Step 9: Submit the timesheet
  const submitted =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      memberAConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(submitted);
  // Step 10: As member B (owner with time:approve), retrieve member A's submitted timesheet
  const retrieved = await api.functional.hrmTimeTracking.member.timesheets.at(
    memberBConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(retrieved);
  // Step 11: Validate business logic assertions
  TestValidator.equals("status is submitted", retrieved.status, "submitted");
  TestValidator.equals(
    "employee matches member A",
    retrieved.employee.member.id,
    memberA.id,
  );
  TestValidator.predicate(
    "submittedAt is populated",
    retrieved.submittedAt !== null && retrieved.submittedAt !== undefined,
  );
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
}
