import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_organization_member_employee_with_department_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin member with employee management permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(adminMember);
  // Step 2: Create an organization to serve as the employer
  const organization =
    await generate_random_erp_hrm_member_organizations_create(adminConnection, {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_url: null,
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization);
  // Step 3: Create a custom role within the organization with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: [
          {
            permission: "employee.manage",
          } satisfies IErpHrmRolePermission.ICreate,
          {
            permission: "organization.manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // Step 4: Create a department within the organization
  const department = await generate_random_erp_hrm_member_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // Step 5: Create a second member who will be the employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employeeMember);
  // Step 6: Create organization member record with complete information
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employeeMember.id,
          roleId: role.id,
          departmentId: department.id,
          position: "Senior Developer",
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // Step 7: Validate the response contains all populated relations
  TestValidator.equals(
    "organization ID matches",
    organizationMember.organizationId,
    organization.id,
  );
  TestValidator.equals(
    "user ID matches",
    organizationMember.userId,
    employeeMember.id,
  );
  TestValidator.equals("role ID matches", organizationMember.roleId, role.id);
  TestValidator.equals(
    "department ID matches",
    organizationMember.departmentId,
    department.id,
  );
  TestValidator.equals(
    "position is Senior Developer",
    organizationMember.position,
    "Senior Developer",
  );
  TestValidator.equals(
    "employment type is full_time",
    organizationMember.employmentType,
    "full_time",
  );
  TestValidator.equals("is active is true", organizationMember.isActive, true);
  // Validate nested relations are populated
  TestValidator.predicate(
    "organization relation populated",
    organizationMember.organization !== null,
  );
  TestValidator.predicate(
    "user relation populated",
    organizationMember.user !== null,
  );
  TestValidator.predicate(
    "role relation populated",
    organizationMember.role !== null,
  );
  TestValidator.predicate(
    "department relation populated",
    organizationMember.department !== null,
  );
}
