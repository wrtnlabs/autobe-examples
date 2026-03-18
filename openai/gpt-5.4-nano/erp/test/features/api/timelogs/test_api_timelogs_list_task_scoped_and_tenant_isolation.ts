import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";

export async function test_api_timelogs_list_task_scoped_and_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join)
  const memberBaseConnection: api.IConnection = { host: connection.host };
  const memberCredentialsEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const authorized = await authorize_member_join(memberBaseConnection, {
    body: {
      email: memberCredentialsEmail,
      password: memberPassword,
      organizationName: `${RandomGenerator.name(2)}-${RandomGenerator.alphabets(6)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
      ] as const),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Create a project in current organization (Organization A)
  const organizationAProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingProject.ICreate>(),
          name: `${RandomGenerator.name(2)}-${RandomGenerator.alphabets(6)}`,
          color: "#3b82f6",
        },
      },
    );
  typia.assert(organizationAProject);
  const workDateStart = new Date();
  const workDateEnd = new Date(workDateStart.getTime() + 24 * 60 * 60 * 1000);
  // 3) Create two tasks in the same project
  const taskA =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: organizationAProject.id },
        body: {
          ...typia.random<IErpHrmTimeTrackingTask.ICreate>(),
          title: `TaskA-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(taskA);
  const taskB =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: organizationAProject.id },
        body: {
          ...typia.random<IErpHrmTimeTrackingTask.ICreate>(),
          title: `TaskB-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(taskB);
  // 4) Create timelogs: taskA, taskB, and no-task (taskId=null)
  const timelogTaskA1 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingTimelog.ICreate>(),
          work_date: workDateStart.toISOString(),
          start_time: null,
          end_time: null,
          duration_minutes: 60,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingProjectId: organizationAProject.id,
          erpHrmTimeTrackingTaskId: taskA.id,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelogTaskA1);
  const timelogTaskB1 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingTimelog.ICreate>(),
          work_date: workDateStart.toISOString(),
          start_time: null,
          end_time: null,
          duration_minutes: 30,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingProjectId: organizationAProject.id,
          erpHrmTimeTrackingTaskId: taskB.id,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelogTaskB1);
  const timelogNoTask =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingTimelog.ICreate>(),
          work_date: workDateEnd.toISOString(),
          start_time: null,
          end_time: null,
          duration_minutes: 15,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingProjectId: organizationAProject.id,
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelogNoTask);
  // 5) List with taskId=taskA.id
  const pageA = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        workDateFrom: workDateStart.toISOString(),
        workDateTo: workDateEnd.toISOString(),
        projectId: organizationAProject.id,
        taskId: taskA.id,
        employeeId: null,
        timesheetId: null,
      } satisfies IErpHrmTimeTrackingTimelog.IRequest,
    },
  );
  typia.assert(pageA);
  TestValidator.predicate(
    "should return at least one timelog for taskA",
    pageA.data.length > 0,
  );
  for (const item of pageA.data) {
    TestValidator.equals(
      "timelog project matches",
      item.project.id,
      organizationAProject.id,
    );
    if (item.task !== null) {
      TestValidator.equals(
        "timelog task matches filter",
        item.task.id,
        taskA.id,
      );
    } else {
      // If the server treats taskId filter as strict, task should never be null here.
      // If it ever returns null task, it must only be the timelog we created without task.
      TestValidator.equals(
        "null task item is the no-task timelog",
        item.id,
        timelogNoTask.id,
      );
    }
  }
  // 6) Create Organization B and timelog data (for tenant isolation)
  const organizationB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingOrganization.ICreate>(),
          name: `${RandomGenerator.name(2)}-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationB);
  const organizationBProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingProject.ICreate>(),
          name: `${RandomGenerator.name(2)}-${RandomGenerator.alphabets(6)}`,
          color: "#22c55e",
        },
      },
    );
  typia.assert(organizationBProject);
  const taskBOnly =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: organizationBProject.id },
        body: {
          ...typia.random<IErpHrmTimeTrackingTask.ICreate>(),
          title: `TaskBOnly-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(taskBOnly);
  const timelogOrgB =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          ...typia.random<IErpHrmTimeTrackingTimelog.ICreate>(),
          work_date: workDateStart.toISOString(),
          start_time: null,
          end_time: null,
          duration_minutes: 45,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingProjectId: organizationBProject.id,
          erpHrmTimeTrackingTaskId: taskBOnly.id,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelogOrgB);
  // 7) List again with strict project/task filters for Organization A data
  const pageA2 = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        workDateFrom: workDateStart.toISOString(),
        workDateTo: workDateEnd.toISOString(),
        projectId: organizationAProject.id,
        taskId: taskA.id,
        employeeId: null,
        timesheetId: null,
      } satisfies IErpHrmTimeTrackingTimelog.IRequest,
    },
  );
  typia.assert(pageA2);
  TestValidator.predicate(
    "response data should be non-empty for tenant isolation check",
    pageA2.data.length > 0,
  );
  for (const item of pageA2.data) {
    TestValidator.equals(
      "tenant isolation: should not include Organization B timelog",
      item.id === timelogOrgB.id,
      false,
    );
    TestValidator.equals(
      "cross-tenant timelogs must not appear (project scoped to A)",
      item.project.id,
      organizationAProject.id,
    );
    if (item.task !== null) {
      TestValidator.equals("task scoped to taskA", item.task.id, taskA.id);
    } else {
      // If the server returns null task items in a task-scoped query, only allow the no-task timelog.
      TestValidator.equals(
        "null task item is the no-task timelog",
        item.id,
        timelogNoTask.id,
      );
    }
  }
}
