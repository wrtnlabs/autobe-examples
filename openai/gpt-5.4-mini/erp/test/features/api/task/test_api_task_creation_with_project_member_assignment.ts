import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function test_api_task_creation_with_project_member_assignment(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const assigneeConnection: api.IConnection = { host: connection.host };
  const assigneeAuthorized = await authorize_member_join(assigneeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(assigneeAuthorized);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          erpHrmtimeEmployeeId: assigneeAuthorized.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const parentTaskBody = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    priority: "high",
    estimatedHours: 4,
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
  } satisfies IErpHrmTimeTaskHistoryEntry.ICreate;
  const parentTask =
    await api.functional.erpHrmTime.member.projects.tasks.create(
      ownerConnection,
      {
        projectId: project.id,
        body: parentTaskBody,
      },
    );
  typia.assert(parentTask);
  const taskBody = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "urgent",
    estimatedHours: 8,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    employeeId: assigneeAuthorized.id,
    parentTaskId: parentTask.id,
  } satisfies IErpHrmTimeTaskHistoryEntry.ICreate;
  const task = await api.functional.erpHrmTime.member.projects.tasks.create(
    ownerConnection,
    {
      projectId: project.id,
      body: taskBody,
    },
  );
  typia.assert(task);
  TestValidator.equals("project linked", task.project.id, project.id);
  TestValidator.equals(
    "assignee linked",
    task.employee?.id,
    assigneeAuthorized.id,
  );
  TestValidator.equals("parent linked", task.parentTask?.id, parentTask.id);
  TestValidator.equals("title persisted", task.title, taskBody.title);
  TestValidator.equals(
    "description persisted",
    task.description,
    taskBody.description,
  );
  TestValidator.equals("priority persisted", task.priority, taskBody.priority);
  TestValidator.equals(
    "estimated hours persisted",
    task.estimatedHours,
    taskBody.estimatedHours,
  );
  TestValidator.equals("due date persisted", task.dueDate, taskBody.dueDate);
  const defaultStatusTask =
    await api.functional.erpHrmTime.member.projects.tasks.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.name(),
          priority: "medium",
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(defaultStatusTask);
  TestValidator.equals(
    "default status is open",
    defaultStatusTask.status,
    "open",
  );
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderAuthorized = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsiderAuthorized);
  await TestValidator.httpError(
    "reject non-member assignee",
    [400, 403],
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.create(
        ownerConnection,
        {
          projectId: project.id,
          body: {
            title: RandomGenerator.name(),
            priority: "medium",
            employeeId: outsiderAuthorized.id,
          } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
        },
      );
    },
  );
}
