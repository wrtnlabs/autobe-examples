import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";

export async function test_api_timelog_create_project_task_and_status_rules(
  connection: api.IConnection,
): Promise<void> {
  const workDate = new Date("2026-03-18T11:45:01.640Z").toISOString();
  const durationMinutes = 30;
  // Actor 1: new member join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${RandomGenerator.name(2).replace(/\s+/g, "").toLowerCase()}_${Date.now()}@example.com`;
  const memberPassword = "Password123!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      organizationName: `org_${RandomGenerator.alphabets(10)}_${Date.now()}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // Actor-scoped connection uses token set by authorize_member_join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  const actorEmployeeId = authorized.id;
  // Helper: create project with desired status via generator
  const createProjectWithStatus = async (status: string) => {
    const project =
      await generate_random_erp_hrm_time_tracking_member_projects_create(
        userConnection,
        {
          body: {
            name: `proj_${RandomGenerator.alphabets(10)}_${Date.now()}`,
            color: "#123ABC",
            status,
          },
        },
      );
    typia.assert(project);
    return project;
  };
  const activeProjectStatus = "active";
  // Scenario 1: timelog linked only to active project
  {
    const project = await createProjectWithStatus(activeProjectStatus);
    const timelog =
      await generate_random_erp_hrm_time_tracking_member_timelogs_create(
        userConnection,
        {
          body: {
            work_date: workDate,
            duration_minutes: durationMinutes,
            erpHrmTimeTrackingProjectId: project.id,
            erpHrmTimeTrackingTaskId: undefined,
            erpHrmTimeTrackingTimesheetId: undefined,
            note: null,
            start_time: null,
            end_time: null,
          },
        },
      );
    typia.assert(timelog);
    TestValidator.equals("timelog id exists", timelog.id.length > 0, true);
    TestValidator.equals(
      "work_date matches input",
      timelog.work_date,
      workDate,
    );
    TestValidator.equals(
      "duration_minutes matches input",
      timelog.duration_minutes,
      durationMinutes,
    );
    TestValidator.equals("project id matches", timelog.project.id, project.id);
    TestValidator.equals(
      "project status matches active",
      timelog.project.status,
      project.status,
    );
    TestValidator.equals("task is null", timelog.task, null);
    TestValidator.equals("timesheet is null", timelog.timesheet, null);
    TestValidator.equals(
      "employee scoped to actor",
      timelog.employee.id,
      actorEmployeeId,
    );
  }
  // Scenario 2: timelog linked to active project + existing task
  {
    const project = await createProjectWithStatus(activeProjectStatus);
    const membership =
      await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
        userConnection,
        {
          params: { projectId: project.id },
          body: {
            employee_id: actorEmployeeId,
            membership_role: typia.random<string>(),
          },
        },
      );
    typia.assert(membership);
    TestValidator.equals(
      "membership project matches",
      membership.project_id,
      project.id,
    );
    const task =
      await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
        userConnection,
        {
          params: { projectId: project.id },
          body: {
            title: `task_${RandomGenerator.alphabets(8)}_${Date.now()}`,
            description: null,
            status: "open",
            priority: "normal",
            assigned_employee_id: null,
            parent_task_id: null,
            estimated_hours: null,
            due_date: null,
          },
        },
      );
    typia.assert(task);
    const timelog =
      await generate_random_erp_hrm_time_tracking_member_timelogs_create(
        userConnection,
        {
          body: {
            work_date: workDate,
            duration_minutes: durationMinutes,
            erpHrmTimeTrackingProjectId: project.id,
            erpHrmTimeTrackingTaskId: task.id,
            erpHrmTimeTrackingTimesheetId: undefined,
            note: null,
            start_time: null,
            end_time: null,
          },
        },
      );
    typia.assert(timelog);
    TestValidator.equals("task id matches", timelog.task?.id, task.id);
    TestValidator.equals("project id matches", timelog.project.id, project.id);
    TestValidator.equals(
      "task belongs to same project",
      timelog.task?.project.id,
      project.id,
    );
    TestValidator.equals(
      "employee scoped to actor",
      timelog.employee.id,
      actorEmployeeId,
    );
  }
  // Scenario 3: reject timelog creation when project is archived/completed
  {
    const nonActiveStatusCandidates = [
      "archived",
      "completed",
      "inactive",
      "done",
    ];
    let archivedProject: IErpHrmTimeTrackingProject | undefined;
    for (const candidate of nonActiveStatusCandidates) {
      const project = await TestValidator.error(
        "create non-active project" as any,
        async () => {
          archivedProject = await createProjectWithStatus(candidate);
        },
      ).catch(async () => {
        // Ignore failures and try next candidate
      });
      if (archivedProject) break;
    }
    if (!archivedProject) {
      // Fallback: attempt with archived; if still fails test should fail
      archivedProject = await createProjectWithStatus("archived");
    }
    const payload: IErpHrmTimeTrackingTimelog.ICreate = {
      work_date: workDate,
      duration_minutes: durationMinutes,
      erpHrmTimeTrackingProjectId: archivedProject.id,
      erpHrmTimeTrackingTaskId: undefined,
      erpHrmTimeTrackingTimesheetId: undefined,
      note: null,
      start_time: null,
      end_time: null,
    };
    await TestValidator.httpError(
      "reject timelog for non-active project",
      [400, 403, 404, 422],
      async () => {
        await generate_random_erp_hrm_time_tracking_member_timelogs_create(
          userConnection,
          {
            body: payload,
          },
        );
      },
    );
    await TestValidator.httpError(
      "reject timelog for non-active project (repeat)",
      [400, 403, 404, 422],
      async () => {
        await generate_random_erp_hrm_time_tracking_member_timelogs_create(
          userConnection,
          {
            body: payload,
          },
        );
      },
    );
  }
}
