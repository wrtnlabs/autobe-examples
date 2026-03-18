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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test the creation of an organization member with minimal required fields and no department assignment.
 * Validates that an employee can be created with only organizationId, userId, roleId, employmentType, and isActive,
 * without departmentId or position, and that the response correctly shows null for these optional fields.
 */
export async function test_api_organization_member_employee_without_department(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member with employee management permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {});
  typia.assert(adminMember);
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        permissions: [
          { permission: "employee.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(role);
  // 4. Create a second member account to be assigned as an employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeMember);
  // 5. Create an organization member with only required fields, without departmentId or position
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employeeMember.id,
          roleId: role.id,
          employmentType: "part_time",
          isActive: true,
          departmentId: null,
          position: null,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 6. Validate the response shows null for department and position fields
  TestValidator.equals(
    "department is null",
    organizationMember.department,
    null,
  );
  TestValidator.equals("position is null", organizationMember.position, null);
  TestValidator.equals("isActive is true", organizationMember.isActive, true);
  TestValidator.equals(
    "employmentType is part_time",
    organizationMember.employmentType,
    "part_time",
  );
  TestValidator.equals(
    "userId matches employee member",
    organizationMember.userId,
    employeeMember.id,
  );
  TestValidator.equals(
    "organizationId matches",
    organizationMember.organizationId,
    organization.id,
  );
  TestValidator.equals("roleId matches", organizationMember.roleId, role.id);
}
