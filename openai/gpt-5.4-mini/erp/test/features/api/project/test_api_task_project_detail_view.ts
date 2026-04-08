import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
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
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function test_api_task_project_detail_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/erp-hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const project = await api.functional.erpHrmTime.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 40,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const task = await api.functional.erpHrmTime.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
        estimatedHours: 8,
        dueDate: new Date().toISOString(),
        employeeId: null,
        parentTaskId: null,
      } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
    },
  );
  typia.assert(task);
  const read = await api.functional.erpHrmTime.member.projects.tasks.at(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  typia.assert(read);
  TestValidator.equals("task id", read.id, task.id);
  TestValidator.equals("project id", read.project.id, project.id);
  TestValidator.equals("task title", read.title, task.title);
  TestValidator.equals("task description", read.description, task.description);
  TestValidator.equals("task status", read.status, task.status);
  TestValidator.equals("task priority", read.priority, task.priority);
  TestValidator.equals(
    "estimated hours",
    read.estimatedHours,
    task.estimatedHours,
  );
  TestValidator.equals("due date", read.dueDate, task.dueDate);
  TestValidator.equals("employee reference", read.employee, task.employee);
  TestValidator.equals(
    "parent task reference",
    read.parentTask,
    task.parentTask,
  );
  TestValidator.equals("created at", read.created_at, task.created_at);
  TestValidator.equals("updated at", read.updated_at, task.updated_at);
  TestValidator.equals("deleted at", read.deleted_at, task.deleted_at);
}
