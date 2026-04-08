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

export async function test_api_project_members_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a project
  const project = typia.assert<IErpHrmProject>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {}),
  );
  // Get project ID from the response - IErpHrmProject.items contains projectId
  const projectId =
    project.items[0]?.projectId ?? typia.random<string & tags.Format<"uuid">>();
  // 3. Create employee users first (need actual user accounts for project membership)
  // Create first employee user
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Auth = await authorize_admin_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create second employee user
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Auth = await authorize_admin_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create third employee user (for project lead)
  const employee3Connection: api.IConnection = { host: connection.host };
  const employee3Auth = await authorize_admin_join(employee3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create employees in the organization using admin
  const employee1 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employee1Auth.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
        position: "Developer",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  const employee2 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employee2Auth.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
        position: "Designer",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  const employee3 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employee3Auth.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
        position: "Manager",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  // 5. Assign employees to project using projectId from response
  const member1 = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: projectId },
      body: { assignedRole: "member", employeeId: employee1.id },
    },
  );
  typia.assert(member1);
  const member2 = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: projectId },
      body: { assignedRole: "member", employeeId: employee2.id },
    },
  );
  typia.assert(member2);
  const projectLead =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectId },
        body: { assignedRole: "project_lead", employeeId: employee3.id },
      },
    );
  typia.assert(projectLead);
  // 6. Call PATCH endpoint with default pagination
  const response = await api.functional.erpHrm.admin.projects.members.index(
    adminConnection,
    {
      projectId: projectId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(response);
  // 7. Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination records", response.pagination.records, 3);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // 8. Validate data array contains all members
  TestValidator.equals("data length", response.data.length, 3);
  // 9. Validate response structure (data array contains ISummary items)
  TestValidator.predicate(
    "data array exists and has members",
    response.data !== null && response.data !== undefined,
  );
  // 10. Validate count via records
  TestValidator.equals(
    "total count matches records",
    response.pagination.records,
    response.data.length,
  );
}
