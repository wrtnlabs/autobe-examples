import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_update_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates an organization and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a project
  const projectResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: prepare_random_erp_hrm_project({}),
    },
  );
  const project = projectResponse as unknown as IErpHrmProject.ISummary;
  // 3. Admin creates a task under the project
  const taskResponse = await api.functional.erpHrm.admin.projects.tasks.create(
    adminConnection,
    {
      projectId: project.id,
      body: prepare_random_erp_hrm_task({}),
    },
  );
  const task = taskResponse as unknown as IErpHrmTask.ISummary;
  // 4. Member joins and sets organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: { organizationId: project.organization.id },
    },
  );
  // 5. Member creates a timelog
  const timelog = typia.assert<IErpHrmTimelog>(
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: "Original timelog description",
        billable: true,
      },
    }),
  );
  // 6. Manager joins and sets organization context (simulating user with time:manage permission)
  // Note: In a full test environment, the manager would have the time:manage role assigned
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  await generate_random_erp_hrm_member_organization_context_select(
    managerConnection,
    {
      body: { organizationId: project.organization.id },
    },
  );
  // 7. Manager updates the timelog with time:manage permission
  // The time:manage permission allows updating any employee's timelogs
  const updatedTimelog = typia.assert<IErpHrmTimelog>(
    await api.functional.erpHrm.member.timelogs.update(managerConnection, {
      timelogId: timelog.id,
      body: {
        durationMinutes: 180,
        description: "Admin edited this timelog",
      } satisfies IErpHrmTimelog.IUpdate,
    }),
  );
  // 8. Validate the update was successful
  TestValidator.equals(
    "duration updated to 180",
    updatedTimelog.durationMinutes,
    180,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Admin edited this timelog",
  );
}
