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
 * Test deactivating an organization member by setting is_active to false.
 * 1. Create and authenticate a manager user
 * 2. Create organization
 * 3. Create a role
 * 4. Create an active organization member
 * 5. Deactivate the member using PUT endpoint
 * 6. Verify isActive is false and role/department remain intact
 */
export async function test_api_organization_member_deactivation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate manager with employee management permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(managerConnection, {
    body: {
      email: managerEmail,
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
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create a role
  const role = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          { permission: "employee:manage" },
          { permission: "employee:view" },
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Create member connection and join (to get userId)
  const userConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinedUser = await authorize_member_join(userConnection, {
    body: {
      email: userEmail,
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
  typia.assert(joinedUser);
  // 5. Create active organization member
  const member =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: joinedUser.id,
          roleId: role.id,
          departmentId: null,
          position: RandomGenerator.name(),
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(member);
  // Verify member was created active
  TestValidator.equals("member is initially active", member.isActive, true);
  // 6. Deactivate the member using PUT endpoint
  const updatedMember =
    await api.functional.erpHrm.member.organizationMembers.update(
      managerConnection,
      {
        organizationMemberId: member.id,
        body: {
          is_active: false,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 7. Verify deactivation - isActive should be false
  TestValidator.equals(
    "member isActive is false",
    updatedMember.isActive,
    false,
  );
  // 8. Verify role and department remain intact
  TestValidator.equals("role ID unchanged", updatedMember.roleId, role.id);
  TestValidator.equals(
    "department ID unchanged",
    updatedMember.departmentId,
    null,
  );
  // 9. Verify historical data preserved - user info still accessible
  TestValidator.equals(
    "user ID preserved",
    updatedMember.userId,
    joinedUser.id,
  );
  TestValidator.predicate("user data accessible", updatedMember.user !== null);
}
