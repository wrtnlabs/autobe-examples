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

export async function test_api_timesheet_delete_draft_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Member setup with known credentials for re-login
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register a new member
  const joinResult = await authorize_member_join(memberConnection, {
    body: { email, password },
  });
  typia.assert(joinResult);
  // 2. Create an organization (automatically creates owner employee record)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the organization context
  const switchedOrg =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      { organizationId: organization.id },
    );
  typia.assert(switchedOrg);
  // 4. Re-login to get updated member profile with employee records
  const loginResult = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
      href: connection.host,
      referrer: "",
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(loginResult);
  const employeeId = loginResult.employees[0].id;
  // 5. Re-switch organization context (login creates a new session)
  await api.functional.hrmTimeTracking.member._switch.organizations.change(
    memberConnection,
    { organizationId: organization.id },
  );
  // 6. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 7. Add the owner as a project member with 'member' role
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { employee_id: employeeId, role: "member" },
      },
    );
  typia.assert(projectMember);
  // 8. Calculate the current work week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split("T")[0];
  // 9. Create a timelog within the work week against the project
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: monday.toISOString(),
        },
      },
    );
  typia.assert(timelog);
  // 10. Create a draft timesheet for the current work week
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: { week_start_date: weekStartDate },
      },
    );
  typia.assert(timesheet);
  // Validate the timesheet was created as a draft with associated timelogs
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "timesheet has associated timelogs",
    timesheet.timelogs.length > 0,
  );
  // 11. Delete the draft timesheet
  await api.functional.hrmTimeTracking.member.timesheets.erase(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  // Success: HTTP 204 No Content — no exception thrown means deletion succeeded
}
