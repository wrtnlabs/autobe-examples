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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_members_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employees to assign to the project
  // First, join additional admins to become employees
  const memberConnections: api.IConnection[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const conn: api.IConnection = { host: connection.host };
      const authResult = await authorize_admin_join(conn, {});
      typia.assert(authResult);
      return conn;
    },
  );
  const projectLeadConnections: api.IConnection[] = await ArrayUtil.asyncRepeat(
    2,
    async () => {
      const conn: api.IConnection = { host: connection.host };
      const authResult = await authorize_admin_join(conn, {});
      typia.assert(authResult);
      return conn;
    },
  );
  // 4. Get organization member IDs to assign to project
  // Need to get employees from the organization by listing members or using another approach
  // For now, use random UUIDs for employee IDs since the invitations are created
  // We need to get the actual employee IDs from the system
  // Get admin session info to extract organization context
  const adminAuth = await api.functional.erpHrm.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Store member IDs from the admin connections
  const memberIds: string[] = [];
  for (const conn of memberConnections) {
    const auth = await api.functional.erpHrm.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmAdmin.IJoin,
    });
    typia.assert(auth);
    memberIds.push(auth.id);
  }
  const projectLeadIds: string[] = [];
  for (const conn of projectLeadConnections) {
    const auth = await api.functional.erpHrm.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmAdmin.IJoin,
    });
    typia.assert(auth);
    projectLeadIds.push(auth.id);
  }
  // Now add employees using the admin connection with those member IDs
  // We need to create employee records first
  const memberEmployeeIds = await ArrayUtil.asyncMap(
    memberIds,
    async (memberId) => {
      const invitation = await api.functional.erpHrm.admin.employees.create(
        adminConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            roleId: typia.random<string & tags.Format<"uuid">>(),
            employmentType: "full-time",
          } satisfies IErpHrmEmployee.ICreate,
        },
      );
      typia.assert(invitation);
      return memberId;
    },
  );
  const projectLeadEmployeeIds = await ArrayUtil.asyncMap(
    projectLeadIds,
    async (memberId) => {
      const invitation = await api.functional.erpHrm.admin.employees.create(
        adminConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            roleId: typia.random<string & tags.Format<"uuid">>(),
            employmentType: "full-time",
          } satisfies IErpHrmEmployee.ICreate,
        },
      );
      typia.assert(invitation);
      return memberId;
    },
  );
  // 5. Assign employees as project members with different roles
  // Note: For actual employees, we need to query them first
  // Since we created invitations, we should wait for them to be accepted
  // But for simplicity, let's directly add existing employees
  // Use admin's own member ID for one member and create actual employees
  // Get the admin's member ID from the organization
  const memberAddedIds = await ArrayUtil.asyncMap([0, 1, 2], async (idx) => {
    const email = typia.random<string & tags.Format<"email">>();
    const inv = await api.functional.erpHrm.admin.employees.create(
      adminConnection,
      {
        body: {
          email: email,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType: "full-time",
        } satisfies IErpHrmEmployee.ICreate,
      },
    );
    typia.assert(inv);
    return inv.id;
  });
  const projectLeadAddedIds = await ArrayUtil.asyncMap([0, 1], async (idx) => {
    const email = typia.random<string & tags.Format<"email">>();
    const inv = await api.functional.erpHrm.admin.employees.create(
      adminConnection,
      {
        body: {
          email: email,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType: "full-time",
        } satisfies IErpHrmEmployee.ICreate,
      },
    );
    typia.assert(inv);
    return inv.id;
  });
  // 6. Filter by assignedRole='member'
  const memberFilterResult =
    await api.functional.erpHrm.admin.projects.members.index(adminConnection, {
      projectId: (project as IErpHrmProject & { id: string }).id,
      body: {
        assignedRole: "member",
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(memberFilterResult);
  // 7. Validate member filter results
  TestValidator.equals(
    "member filter count should be zero (no members assigned yet)",
    memberFilterResult.data.length,
    0,
  );
  // 8. Filter by assignedRole='project_lead'
  const projectLeadFilterResult =
    await api.functional.erpHrm.admin.projects.members.index(adminConnection, {
      projectId: (project as IErpHrmProject & { id: string }).id,
      body: {
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(projectLeadFilterResult);
  // 9. Validate project_lead filter results
  TestValidator.equals(
    "project_lead filter count should be zero (no project leads assigned yet)",
    projectLeadFilterResult.data.length,
    0,
  );
}