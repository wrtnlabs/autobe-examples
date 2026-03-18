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

export async function test_api_organization_member_role_department_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as manager with employee management permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(manager);
  // 2. Create organization to establish organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create a Manager role to assign to the member (with employee management permission)
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Manager",
        permissions: [
          { permission: "employee:manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(managerRole);
  // 4. Create a department for employee assignment
  const department = await generate_random_erp_hrm_member_departments_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(department);
  // 5. Create the target user to be added as organization member
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_member_join(targetUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(targetUser);
  // 6. Create the target organization member to be updated (initially as part-time employee)
  const initialRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Employee",
        permissions: [] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(initialRole);
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: targetUser.id,
          roleId: initialRole.id,
          employmentType: "part_time",
          isActive: true,
          position: "Junior Developer",
        },
      },
    );
  typia.assert(organizationMember);
  // 7. Update the member: promote to Manager, assign to department, update position, change to full_time
  const updatedMember =
    await api.functional.erpHrm.member.organizationMembers.update(
      managerConnection,
      {
        organizationMemberId: organizationMember.id,
        body: {
          role_id: managerRole.id,
          department_id: department.id,
          position: "Senior Developer",
          employment_type: "full_time",
          is_active: true,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 8. Validate the response contains updated OrganizationMember with proper field values
  TestValidator.equals(
    "role_id updated correctly",
    updatedMember.roleId,
    managerRole.id,
  );
  TestValidator.equals(
    "department_id updated correctly",
    updatedMember.departmentId,
    department.id,
  );
  TestValidator.equals(
    "position updated correctly",
    updatedMember.position,
    "Senior Developer",
  );
  TestValidator.equals(
    "employment_type updated correctly",
    updatedMember.employmentType,
    "full_time",
  );
  TestValidator.equals("is_active remains true", updatedMember.isActive, true);
  // 9. Validate nested relations are properly populated
  TestValidator.predicate(
    "user relation is populated",
    updatedMember.user !== null,
  );
  TestValidator.predicate(
    "role relation is populated",
    updatedMember.role !== null,
  );
  TestValidator.predicate(
    "department relation is populated",
    updatedMember.department !== null,
  );
  TestValidator.predicate(
    "organization relation is populated",
    updatedMember.organization !== null,
  );
  // 10. Validate specific nested data matches expected values
  TestValidator.equals(
    "user id matches target user",
    updatedMember.user.id,
    targetUser.id,
  );
  TestValidator.equals(
    "role id matches manager role",
    updatedMember.role.id,
    managerRole.id,
  );
  TestValidator.equals(
    "department id matches",
    updatedMember.department!.id,
    department.id,
  );
  TestValidator.equals(
    "organization id matches",
    updatedMember.organization.id,
    organization.id,
  );
}
