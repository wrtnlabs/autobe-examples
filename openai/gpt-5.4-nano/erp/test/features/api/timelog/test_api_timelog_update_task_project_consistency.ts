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

export async function test_api_timelog_update_task_project_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join member (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Pass-${RandomGenerator.alphabets(10)}!23`,
      organizationName: `Org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // Scenario 1: success within same project
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authConnection,
      {
        body: {
          name: `Project-A-${RandomGenerator.alphabets(6)}`,
          color: "#00AAFF",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    authConnection,
    {
      params: { projectId: projectA.id },
      body: {
        employee_id: memberAuth.id,
        membership_role: "member",
      } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
    },
  );
  const task1 =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `Task-1-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          priority: "normal",
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task1);
  const task2 =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `Task-2-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          priority: "normal",
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task2);
  typia.assert(task1.project.id);
  typia.assert(task2.project.id);
  TestValidator.equals(
    "task1 belongs to projectA",
    task1.project.id,
    projectA.id,
  );
  TestValidator.equals(
    "task2 belongs to projectA",
    task2.project.id,
    projectA.id,
  );
  const timelog1 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      authConnection,
      {
        body: {
          work_date: new Date().toISOString(),
          start_time: null,
          end_time: null,
          duration_minutes: 60,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingProjectId: projectA.id,
          erpHrmTimeTrackingTaskId: task1.id,
          erpHrmTimeTrackingTimesheetId: null,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog1);
  TestValidator.equals(
    "timelog1 project is projectA",
    timelog1.project.id,
    projectA.id,
  );
  await TestValidator.predicate(
    "timelog task reassociation within same project should succeed",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.update(
        authConnection,
        {
          timelogId: timelog1.id,
          body: {
            erp_hrm_time_tracking_task_id: task2.id,
          } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
        },
      );
      return true;
    },
  );
  // Scenario 2: denied mismatch
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authConnection,
      {
        body: {
          name: `Project-B-${RandomGenerator.alphabets(6)}`,
          color: "#FF00AA",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectB);
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    authConnection,
    {
      params: { projectId: projectB.id },
      body: {
        employee_id: memberAuth.id,
        membership_role: "member",
      } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
    },
  );
  const taskA =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `Task-A-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          priority: "normal",
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskA);
  const taskB =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: `Task-B-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          priority: "normal",
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskB);
  TestValidator.equals(
    "taskA belongs to projectA",
    taskA.project.id,
    projectA.id,
  );
  TestValidator.equals(
    "taskB belongs to projectB",
    taskB.project.id,
    projectB.id,
  );
  const timelog2 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      authConnection,
      {
        body: {
          work_date: new Date().toISOString(),
          start_time: null,
          end_time: null,
          duration_minutes: 30,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingProjectId: projectA.id,
          erpHrmTimeTrackingTaskId: taskA.id,
          erpHrmTimeTrackingTimesheetId: null,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog2);
  TestValidator.equals(
    "timelog2 project is projectA",
    timelog2.project.id,
    projectA.id,
  );
  await TestValidator.error(
    "reject task reassociation across different project",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.update(
        authConnection,
        {
          timelogId: timelog2.id,
          body: {
            erp_hrm_time_tracking_task_id: taskB.id,
          } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
        },
      );
    },
  );
}
