import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_creation_with_project_member_assignee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create project
  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: "Dev Project",
        color: "#3498DB" as string & typia.tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 4. Get employee list to find member's employeeId
  const employeePage = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  const memberEmployee = employeePage.data.find(
    (e) => e.member.email === member.email,
  );
  if (!memberEmployee) {
    throw new Error("Member employee not found");
  }
  // 5. Add member to project - need to use projectId and body with erp_hrm_employee_id and assignedRole
  const projectMemberBody = {
    erp_hrm_employee_id: memberEmployee.id,
    assignedRole: "member" as const,
  };
  const projectMembership =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: project.id,
      body: projectMemberBody as any,
    });
  typia.assert(projectMembership);
  // 6. Create task with assignee
  const task = await api.functional.erpHrm.admin.projects.tasks.create(
    adminConnection,
    {
      projectId: project.id,
      body: {
        title: "Code review",
        priority: "medium",
        erp_hrm_employee_id: memberEmployee.id,
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // 7-9. Validate
  TestValidator.equals(
    "assignee employee id matches",
    task.assignee?.id,
    memberEmployee.id,
  );
  TestValidator.equals("task status defaults to open", task.status, "open");
}
