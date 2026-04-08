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

export async function test_api_timesheet_action_manager_view_own_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (employee) with organization
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    org_name: RandomGenerator.name(),
    org_currency: "USD",
    org_description: RandomGenerator.paragraph(),
    href: "https://example.com/join",
    referrer: "https://example.com/register",
  } satisfies IHrmPlatformMember.IJoin;
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: memberAJoinInput,
  });
  typia.assert(memberAAuth);
  const memberA = memberAAuth.member;
  // 2. Create project for Member A (includes organization context)
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  const organization = project.organization;
  // 3. Create task for timelog assignment
  const taskRaw = await api.functional.hrmPlatform.member.tasks.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        project_id: project.id,
        priority: "MEDIUM",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(taskRaw);
  const task = taskRaw as IHrmPlatformTask & IEntity;
  const taskId = task.id;
  // 4. Create timelog entry
  const now = new Date();
  const startTime = now.toISOString();
  const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberAConnection,
    {
      body: {
        employee_id: memberA.id,
        project_id: project.id,
        task_id: taskId,
        start_datetime: startTime,
        end_datetime: endTime,
        duration_minutes: 240,
        description: "Work session",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 5. Create timesheet in draft status
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberAConnection,
    {
      body: {
        hrm_platform_employee_id: memberA.id,
        start_date: startTime,
        end_date: endTime,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 6. Submit timesheet to create "submit" action
  await api.functional.hrmPlatform.member.timesheets.actions.index(
    memberAConnection,
    {
      timesheetId: timesheet.id,
      body: { action: "submit" },
    },
  );
  // 7. Create Manager B in the same organization
  const managerConnection: api.IConnection = { host: connection.host };
  const managerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    org_name: organization.name,
    org_currency: organization.currency ?? "USD",
    org_description: organization.description ?? undefined,
    org_logo_uri: organization.owner.avatar_uri,
    href: "https://example.com/manager",
    referrer: "https://example.com/manager",
  } satisfies IHrmPlatformMember.IJoin;
  const managerAuth = await authorize_member_join(managerConnection, {
    body: managerJoinInput,
  });
  typia.assert(managerAuth);
  const manager = managerAuth.member;
  // 8. Manager approves Member A's submitted timesheet
  const approveResponse =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      managerConnection,
      {
        timesheetId: timesheet.id,
        body: { action: "approve" },
      },
    );
  // The action index endpoint returns a page of actions - find the approve action
  const approveAction = approveResponse.data.find(
    (action) => action.action === "approve",
  );
  if (!approveAction) {
    throw new Error("Approve action not found in action list");
  }
  typia.assert(approveAction);
  // 9. Retrieve the approve action using the action ID
  const retrievedAction =
    await api.functional.hrmPlatform.member.timesheets.actions.at(
      managerConnection,
      {
        timesheetId: timesheet.id,
        actionId: approveAction.id,
      },
    );
  typia.assert(retrievedAction);
  // 10. Validate the approve action record
  TestValidator.equals(
    "action type is approve",
    retrievedAction.action,
    "approve",
  );
  TestValidator.equals(
    "actor is manager",
    retrievedAction.actor.email,
    manager.email,
  );
  TestValidator.equals(
    "actor display name matches",
    retrievedAction.actor.display_name,
    manager.display_name ?? null,
  );
  TestValidator.equals(
    "timesheet ID matches",
    retrievedAction.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "notes can be null or string",
    retrievedAction.notes,
    null,
  );
  TestValidator.equals(
    "created_at equals updated_at (append-only)",
    retrievedAction.created_at,
    retrievedAction.updated_at,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(retrievedAction.created_at)),
  );
}
