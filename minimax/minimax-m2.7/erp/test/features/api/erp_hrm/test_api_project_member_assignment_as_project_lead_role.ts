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
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_member_assignment_as_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create custom role with project management permissions
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:view", "project:manage"] as (
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
  typia.assert(customRole);
  // 4. Create employee 1 with custom role
  const employee1 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: customRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee1);
  // 5. Create employee 2 with custom role (for testing multiple project leads)
  const employee2 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: customRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee2);
  // 6. Create active project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Get project ID from response (type cast since mock type may not expose id)
  const projectId = (
    project as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  // 7. Assign employee 1 as 'project_lead' to the project
  const projectMember1 =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: employee1.id,
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.ICreate,
    });
  typia.assert(projectMember1);
  // 8. Validate first project lead assignment response
  TestValidator.equals(
    "first project lead assigned",
    projectMember1.memberCount,
    0,
  );
  TestValidator.equals(
    "first project lead count",
    projectMember1.projectLeadCount,
    1,
  );
  // 9. Assign employee 2 as 'project_lead' to verify multiple leads are allowed
  const projectMember2 =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: employee2.id,
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.ICreate,
    });
  typia.assert(projectMember2);
  // 10. Validate second project lead assignment - verify project now has 2 leads
  TestValidator.equals("member count unchanged", projectMember2.memberCount, 0);
  TestValidator.equals(
    "project lead count increased to 2",
    projectMember2.projectLeadCount,
    2,
  );
  // 11. Test assigning as regular 'member' role
  // Create another employee to test member role
  const employee3 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: customRole.id,
        employmentType: "contractor",
      },
    },
  );
  typia.assert(employee3);
  const projectMember3 =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: employee3.id,
        assignedRole: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    });
  typia.assert(projectMember3);
  // 12. Validate member assignment
  TestValidator.equals("member count is 1", projectMember3.memberCount, 1);
  TestValidator.equals(
    "project lead count remains 2",
    projectMember3.projectLeadCount,
    2,
  );
}
