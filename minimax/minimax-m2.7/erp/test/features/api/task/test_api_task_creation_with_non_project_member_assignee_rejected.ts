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

export async function test_api_task_creation_with_non_project_member_assignee_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create Project A (where task creation will be attempted)
  const projectA = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Project A",
        color: "#2ECC71" as const,
        status: "active" as const,
      },
    },
  );
  typia.assert(projectA);
  // 3. Create Project B (not used for assignment in this test)
  const projectB = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Project B",
        color: "#E74C3C" as const,
        status: "active" as const,
      },
    },
  );
  typia.assert(projectB);
  // 4. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 5. Get employee list to obtain employeeId for the member
  const employeeList = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(employeeList);
  // Find the employee associated with the newly created member
  const memberEmployee = employeeList.data.find(
    (emp) => emp.member.email === memberAuth.email,
  );
  TestValidator.equals(
    "member should have an employee record",
    memberEmployee !== undefined,
    true,
  );
  // Note: Adding employee to Project B is not possible via available API
  // The IErpHrmProjectMember.ICreate type does not support erp_hrm_employee_id field
  // 6. Attempt to create task on Project A with non-project-member assignee
  // Since the member is not a member of Project A, this should fail
  await TestValidator.httpError(
    "task creation should fail when assignee is not a project member",
    [400, 403],
    async () => {
      await api.functional.erpHrm.admin.projects.tasks.create(adminConnection, {
        projectId: projectA.id,
        body: {
          title: "Should fail",
          priority: "low" as const,
          erp_hrm_employee_id: memberEmployee!.id,
        } satisfies IErpHrmTask.ICreate,
      });
    },
  );
}
