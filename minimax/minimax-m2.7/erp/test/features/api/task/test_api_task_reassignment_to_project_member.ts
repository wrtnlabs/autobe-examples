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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_reassignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create first project member
  const member1 = await api.functional.erpHrm.admin.projects.members.create(
    adminConnection,
    {
      projectId: project.id,
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(member1);
  // 4. Create second project member
  const member2 = await api.functional.erpHrm.admin.projects.members.create(
    adminConnection,
    {
      projectId: project.id,
      body: {
        name: RandomGenerator.name(),
        color: "#33FF57",
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(member2);
  // 5. Create task assigned to first member
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }) as string &
          tags.MaxLength<255>,
        priority: "medium",
        erp_hrm_employee_id: member1.id,
      },
    },
  );
  typia.assert(task);
  // 6. Update task to reassign to second member
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        erp_hrm_employee_id: member2.id,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 7. Validate reassignment
  TestValidator.equals(
    "erp_hrm_employee_id matches second member",
    updatedTask.assignee?.member.id,
    member2.id,
  );
}
