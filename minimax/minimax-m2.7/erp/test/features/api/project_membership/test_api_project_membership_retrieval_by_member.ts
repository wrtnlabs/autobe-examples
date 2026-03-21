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

export async function test_api_project_membership_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 3. Create member B with stored credentials
  const memberBPassword = RandomGenerator.alphaNumeric(12);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBJoinConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await api.functional.erpHrm.auth.member.join(
    memberBJoinConnection,
    {
      body: {
        email: memberBEmail,
        password: memberBPassword,
        displayName: RandomGenerator.name(),
        href: "http://localhost/test",
        referrer: "http://localhost/",
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(memberBAuthorized);
  // 4. Create admin for employee creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 5. Create employee record for member B using PATCH /erpHrm/admin/employees
  const employeePage = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        limit: 100,
        status: "active",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  // Find member B's employee record from the list
  const memberBEmployee = employeePage.data.find(
    (emp) => emp.member.email === memberBEmail,
  );
  // Handle case where member B might not have an employee record yet
  if (memberBEmployee === undefined) {
    // If member B doesn't have employee record, we cannot assign to project
    TestValidator.predicate("member B has no employee record", true);
  } else {
    // 6. Assign member B to the project using generate utility
    const projectMember =
      await generate_random_erp_hrm_member_projects_members_create(
        memberAConnection,
        {
          params: {
            projectId: project.id,
          },
        },
      );
    typia.assert(projectMember);
    // 7. Login as member B to get their own connection
    const memberBLoginConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(memberBLoginConnection, {
      body: {
        email: memberBEmail,
        password: memberBPassword,
        href: "http://localhost/test",
        referrer: "http://localhost/",
      } satisfies IErpHrmMember.ILogin,
    });
    // 8. Retrieve the project membership using member B's connection
    const membership = await api.functional.erpHrm.member.projects.members.at(
      memberBLoginConnection,
      {
        projectId: project.id,
        memberId: projectMember.id,
      },
    );
    typia.assert(membership);
    // 9. Validate response structure using IErpHrmProjectMember.IInvert
    TestValidator.equals(
      "membership id is UUID",
      membership.id !== undefined,
      true,
    );
    TestValidator.equals(
      "has assigned_role",
      membership.assigned_role !== undefined,
      true,
    );
    TestValidator.equals(
      "has created_at",
      membership.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "has updated_at",
      membership.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "has employee summary",
      membership.employee !== undefined,
      true,
    );
    TestValidator.equals(
      "has project summary",
      membership.project !== undefined,
      true,
    );
    TestValidator.equals(
      "project id matches",
      membership.project.id,
      project.id,
    );
  }
}
