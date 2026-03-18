import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_permissions_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_builtin_role_modification_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (becomes organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (auto-provisions built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: List built-in roles in the organization to find one with is_builtin = true
  const rolesPage =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          is_builtin: true,
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(rolesPage);
  // Find the Manager built-in role
  const builtinRole = rolesPage.data.find(
    (role) => role.is_builtin === true && role.name === "Manager",
  );
  TestValidator.predicate(
    "built-in Manager role must exist",
    () => builtinRole !== undefined,
  );
  // Use non-null assertion after predicate check
  const targetRole = builtinRole!;
  // Capture the original permission set before the rejected attempt
  const originalPermissions = targetRole.permissions.map((p) => p.id);
  // Step 4: Attempt to add a permission to a built-in role — expect 422
  await TestValidator.httpError(
    "adding permission to built-in role must be rejected with 422",
    422,
    async () => {
      await generate_random_erp_hrm_member_organizations_roles_permissions_create(
        memberConnection,
        {
          body: {
            permission_code: "report:view",
          } satisfies IErpHrmRolePermission.ICreate,
          params: {
            organizationId: organization.id,
            roleId: targetRole.id,
          },
        },
      );
    },
  );
  // Step 5: Verify the built-in role's permissions remain unchanged after the rejected attempt
  const rolesPageAfter =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          is_builtin: true,
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(rolesPageAfter);
  const builtinRoleAfter = rolesPageAfter.data.find(
    (role) => role.id === targetRole.id,
  );
  TestValidator.predicate(
    "built-in role must still exist after rejected attempt",
    () => builtinRoleAfter !== undefined,
  );
  const afterPermissions = builtinRoleAfter!.permissions.map((p) => p.id);
  // Verify permissions count is unchanged
  TestValidator.equals(
    "built-in role permissions count must be unchanged after rejected attempt",
    originalPermissions.length,
    afterPermissions.length,
  );
}
