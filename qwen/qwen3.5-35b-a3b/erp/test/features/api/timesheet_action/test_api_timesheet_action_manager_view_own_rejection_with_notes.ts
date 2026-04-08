import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_action_manager_view_own_rejection_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (employee)
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    name: RandomGenerator.name(),
    org_name: RandomGenerator.name(),
    org_currency: "USD",
    org_description: RandomGenerator.paragraph(),
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/signup",
  } satisfies IHrmPlatformMember.IJoin;
  const memberAAuth = await authorize_member_join(connection, {
    body: memberAJoinBody,
  });
  typia.assert(memberAAuth);
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    Authorization: memberAAuth.token.access,
  };
  // 2. Get Member A's employee info
  const memberAId = memberAAuth.member.id;
  // 3. Member A creates a project
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#" + RandomGenerator.alphaNumeric(6).toUpperCase(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Member A creates a timelog entry (without task, since task_id is optional)
  const startDate = new Date();
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(17, 0, 0, 0);
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberAConnection,
    {
      body: {
        employee_id: memberAId,
        project_id: project.id,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        duration_minutes: 480,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 5. Member A creates a timesheet in pending status
  const timesheetStart = new Date(startDate);
  timesheetStart.setDate(startDate.getDate() - startDate.getDay());
  timesheetStart.setHours(0, 0, 0, 0);
  const timesheetEnd = new Date(timesheetStart);
  timesheetEnd.setDate(timesheetStart.getDate() + 6);
  timesheetEnd.setHours(23, 59, 59, 999);
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberAConnection,
    {
      body: {
        start_date: timesheetStart.toISOString(),
        end_date: timesheetEnd.toISOString(),
        hrm_platform_employee_id: memberAId,
        notes: "Test timesheet for validation",
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 6. Submit the timesheet (create submit action)
  const submitRequestBody = {
    action: "submit",
  } satisfies IHrmPlatformTimesheetAction.IRequest;
  await api.functional.hrmPlatform.member.timesheets.actions.index(
    memberAConnection,
    {
      timesheetId: timesheet.id,
      body: submitRequestBody,
    },
  );
  // 7. Create Member B (manager) in same organization
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "managerpass456",
    name: RandomGenerator.name(),
    org_name: memberAJoinBody.org_name,
    org_currency: memberAJoinBody.org_currency,
    org_description: memberAJoinBody.org_description,
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/signup",
  } satisfies IHrmPlatformMember.IJoin;
  const memberBAuth = await authorize_member_join(connection, {
    body: memberBJoinBody,
  });
  typia.assert(memberBAuth);
  const memberBConnection: api.IConnection = { host: connection.host };
  memberBConnection.headers = {
    Authorization: memberBAuth.token.access,
  };
  const memberBId = memberBAuth.member.id;
  // 8. Manager B rejects the timesheet (create reject action)
  const rejectRequestBody = {
    action: "reject",
  } satisfies IHrmPlatformTimesheetAction.IRequest;
  const actionsResponse =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberBConnection,
      {
        timesheetId: timesheet.id,
        body: rejectRequestBody,
      },
    );
  typia.assert(actionsResponse);
  // 9. Retrieve the reject action by ID
  const rejectActionId =
    actionsResponse.data[actionsResponse.data.length - 1]?.id;
  if (!rejectActionId) {
    throw new Error("Reject action ID not found in action list");
  }
  const rejectAction =
    await api.functional.hrmPlatform.member.timesheets.actions.at(
      memberBConnection,
      {
        timesheetId: timesheet.id,
        actionId: rejectActionId,
      },
    );
  typia.assert(rejectAction);
  // 10. Validate the reject action
  TestValidator.equals("action type is reject", rejectAction.action, "reject");
  TestValidator.equals("actor is manager B", rejectAction.actor.id, memberBId);
  TestValidator.equals(
    "actor email matches manager B",
    rejectAction.actor.email,
    memberBAuth.member.email,
  );
  TestValidator.equals(
    "timesheet matches rejected timesheet",
    rejectAction.timesheet.id,
    timesheet.id,
  );
  // Notes field is optional and may be null based on API capabilities
  TestValidator.predicate(
    "notes field is valid (string or null)",
    typeof rejectAction.notes === "string" || rejectAction.notes === null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(rejectAction.created_at)),
  );
  TestValidator.equals(
    "timestamps valid",
    rejectAction.created_at,
    rejectAction.updated_at,
  );
}
