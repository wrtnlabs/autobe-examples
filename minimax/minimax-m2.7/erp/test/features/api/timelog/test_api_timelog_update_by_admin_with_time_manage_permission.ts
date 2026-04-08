import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_timelog_update_by_admin_with_time_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates via /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create organization context
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      },
    },
  );
  // 3. Create custom role with time:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["time:manage"] as (
          | "org:manage"
          | "employee:manage"
          | "employee:view"
          | "project:manage"
          | "project:view"
          | "time:manage"
          | "time:approve"
          | "time:view_all"
          | "report:view"
        )[],
      },
    },
  );
  // 4. Create employee with time:manage role
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: employeeEmail,
      roleId: role.id,
      employmentType: "full-time",
    },
  });
  // 5. Create department
  await generate_random_erp_hrm_admin_departments_create(adminConnection, {
    body: {
      name: RandomGenerator.name(),
    },
  });
  // 6. Create project - use ISummary type that has id
  const projectSummary = typia.assert<IErpHrmProject.ISummary>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        color: "#4A90E2",
      },
    }),
  );
  // 7. Create task - use ISummary type that has id
  const taskSummary = typia.assert<IErpHrmTask.ISummary>(
    await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
      body: {
        title: RandomGenerator.name(),
      },
      params: {
        projectId: projectSummary.id,
      },
    }),
  );
  // 8. Create employee user account for timelog creation
  const employeeUserConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(employeeUserConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 9. Set up member ID for timelog operations
  const memberId = adminAuth.id;
  const timelogId = typia.random<string & tags.Format<"uuid">>();
  // 10. Admin updates the timelog via PUT /erpHrm/admin/members/{memberId}/timelogs/{timelogId}
  const updatedTimelog = typia.assert<IErpHrmTimelog>(
    await api.functional.erpHrm.admin.members.timelogs.update(adminConnection, {
      memberId: memberId,
      timelogId: timelogId,
      body: {
        durationMinutes: 120 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        description: "Updated work description",
      } satisfies IErpHrmTimelog.IUpdate,
    }),
  );
  // Validate response
  TestValidator.equals(
    "duration updated to 120",
    updatedTimelog.durationMinutes,
    120,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work description",
  );
  TestValidator.predicate(
    "project association intact",
    updatedTimelog.project.id === projectSummary.id,
  );
  TestValidator.predicate(
    "task association intact",
    updatedTimelog.task?.id === taskSummary.id,
  );
}
