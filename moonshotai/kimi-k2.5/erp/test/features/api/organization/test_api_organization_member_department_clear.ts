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

export async function test_api_organization_member_department_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection for manager
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
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
  typia.assert(manager);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role with employee management permission
  const role = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            permission: "employee.manage",
          },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(role);
  // 4. Create department
  const department = await generate_random_erp_hrm_member_departments_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 5. Create a member user to be assigned as organization member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
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
  typia.assert(memberUser);
  // 6. Create organization member with department assigned
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: memberUser.id,
          roleId: role.id,
          departmentId: department.id,
          employmentType: "full_time",
          isActive: true,
          position: RandomGenerator.name(),
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 7. Verify member has department initially
  TestValidator.predicate(
    "member has department initially",
    organizationMember.departmentId !== null &&
      organizationMember.departmentId !== undefined,
  );
  TestValidator.equals(
    "department id matches assigned department",
    organizationMember.departmentId,
    department.id,
  );
  // 8. Clear department by setting department_id to null using the update endpoint
  const clearedMember =
    await api.functional.erpHrm.member.organizationMembers.update(
      managerConnection,
      {
        organizationMemberId: organizationMember.id,
        body: {
          department_id: null,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(clearedMember);
  // 9. Verify department is cleared but other fields remain unchanged
  TestValidator.equals(
    "department_id is null after clearing",
    clearedMember.departmentId,
    null,
  );
  TestValidator.equals(
    "department relation is null after clearing",
    clearedMember.department,
    null,
  );
  TestValidator.equals(
    "role_id remains unchanged",
    clearedMember.roleId,
    organizationMember.roleId,
  );
  TestValidator.equals(
    "position remains unchanged",
    clearedMember.position,
    organizationMember.position,
  );
  TestValidator.equals(
    "employment_type remains unchanged",
    clearedMember.employmentType,
    organizationMember.employmentType,
  );
  TestValidator.equals(
    "is_active remains unchanged",
    clearedMember.isActive,
    organizationMember.isActive,
  );
}
