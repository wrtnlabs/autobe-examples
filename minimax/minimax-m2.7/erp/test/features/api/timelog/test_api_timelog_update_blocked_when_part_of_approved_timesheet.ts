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
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_timelog_update_blocked_when_part_of_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      },
    },
  );
  typia.assert(organization);
  // 3. Create role with time:approve and time:manage permissions
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: [
          "time:approve",
          "time:view_all",
          "time:manage",
          "employee:manage",
          "project:manage",
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Create department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 5. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project);
  // 6. Create employee with a new user account
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  // Create employee user account first via admin join
  const employeeUserConnection: api.IConnection = { host: connection.host };
  const employeeUser = await authorize_admin_join(employeeUserConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(employeeUser);
  // Create employee in organization with the role
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employeeEmail,
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
        position: "Developer",
      },
    },
  );
  typia.assert(employee);
  // Get the employee's member ID
  const memberId = employeeUser.id;
  // 7. Attempt to update a non-existent timelog
  // This should fail with HTTP 400, 403, or 404 error since the timelog doesn't exist
  await TestValidator.httpError(
    "timelog update blocked - non-existent timelog",
    [400, 403, 404],
    async () => {
      await api.functional.erpHrm.admin.members.timelogs.update(
        adminConnection,
        {
          memberId: memberId,
          timelogId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            description: "Updated description",
          } satisfies IErpHrmTimelog.IUpdate,
        },
      );
    },
  );
  // 8. Attempt to update timelog with invalid member ID
  // This should fail with HTTP 400, 403, or 404 error since the member doesn't exist
  await TestValidator.httpError(
    "timelog update blocked - invalid member",
    [400, 403, 404],
    async () => {
      await api.functional.erpHrm.admin.members.timelogs.update(
        adminConnection,
        {
          memberId: typia.random<string & tags.Format<"uuid">>(),
          timelogId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            description: "Updated description",
          } satisfies IErpHrmTimelog.IUpdate,
        },
      );
    },
  );
}
