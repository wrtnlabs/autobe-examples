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
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {});
  const adminPassword = "Test1234!";
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 2. Set organization context for admin to get organization ID
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  const organizationId = adminOrgContext.organization.id;
  // 3. Create project using admin session
  const project = typia.assert(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#FF5733",
        status: "active",
      },
    }),
  ) as unknown as IErpHrmProject.ISummary;
  // 4. Member join and login
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {});
  const memberPassword = "Test1234!";
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IErpHrmMember.ILogin,
  });
  // 5. Set organization context for member (same as admin) using utility
  const memberOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberLoginConnection,
      {
        body: {
          organizationId: organizationId,
        },
      },
    );
  const employeeId = memberOrgContext.employee.id;
  // 6. Assign member to project
  typia.assert(
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employeeId,
          assignedRole: "member",
        },
      },
    ),
  );
  // 7. Create task within project
  const task = typia.assert(
    await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
      params: { projectId: project.id },
      body: {
        title: "Implement feature X",
        description: "Complete the feature implementation",
      },
    }),
  ) as unknown as IErpHrmTask.ISummary;
  // 8. Create timelog with all optional fields
  const description = "Completed feature implementation";
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    memberLoginConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: description,
        billable: false,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 9. Validate response
  TestValidator.equals("task id matches", timelog.task?.id, task.id);
  TestValidator.equals("description matches", timelog.description, description);
  TestValidator.equals("billable is false", timelog.billable, false);
}
