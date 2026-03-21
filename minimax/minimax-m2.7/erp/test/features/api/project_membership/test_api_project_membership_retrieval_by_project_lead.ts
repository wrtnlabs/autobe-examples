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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_membership_retrieval_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A and create a project
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  // 2. Authenticate as admin to create employee records
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Create member B and get their employee record
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  const memberBEmployees = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  const memberBEmp = memberBEmployees.data.find(
    (e) => e.member.email === memberBAuthorized.email,
  );
  // 4. Create member C and get their employee record
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {});
  const memberCEmployees = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  const memberCEmp = memberCEmployees.data.find(
    (e) => e.member.email === memberCAuthorized.email,
  );
  // 5. Assign member B to project as 'project_lead' role using SDK function
  const memberBAssignment =
    await api.functional.erpHrm.member.projects.members.create(
      memberAConnection,
      {
        projectId: project.id,
        body: {
          erpHrmEmployeeId: memberBEmp!.id,
          assigned_role: "project_lead",
        } as any,
      },
    );
  typia.assert(memberBAssignment);
  // 6. Assign member C to project as 'member' role using SDK function
  const memberCAssignment =
    await api.functional.erpHrm.member.projects.members.create(
      memberAConnection,
      {
        projectId: project.id,
        body: {
          erpHrmEmployeeId: memberCEmp!.id,
          assigned_role: "member",
        } as any,
      },
    );
  typia.assert(memberCAssignment);
  // 7. Authenticate as member B (the project lead)
  const memberBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBLoginConnection, {
    body: {
      email: memberBAuthorized.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.ILogin,
  });
  // 8. Call GET /erpHrm/member/projects/{projectId}/members/{memberId}
  const membership = await api.functional.erpHrm.member.projects.members.at(
    memberBLoginConnection,
    {
      projectId: project.id,
      memberId: memberCAssignment.id,
    },
  );
  typia.assert(membership);
  // 9. Verify response returns with complete project membership record
  TestValidator.equals(
    "membership id matches",
    membership.id,
    memberCAssignment.id,
  );
  TestValidator.equals("project id matches", membership.project.id, project.id);
  TestValidator.equals(
    "employee id matches",
    membership.employee.id,
    memberCEmp!.id,
  );
  // 10. Confirm assigned_role='member' for member C
  TestValidator.equals(
    "assigned role is member",
    membership.assigned_role,
    "member",
  );
}
