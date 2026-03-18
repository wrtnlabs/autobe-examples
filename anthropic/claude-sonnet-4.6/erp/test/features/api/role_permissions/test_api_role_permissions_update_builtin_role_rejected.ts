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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_role_permissions_update_builtin_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (owner is the authenticated member)
  // The organization is automatically provisioned with built-in roles: Owner, Manager, Employee
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: List all roles in the organization to find built-in roles
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
  // Extract built-in roles
  const builtinRoles = rolesPage.data.filter(
    (role) => role.is_builtin === true,
  );
  // Verify we found built-in roles (there should be at least 3: Owner, Manager, Employee)
  TestValidator.predicate(
    "should have built-in roles",
    builtinRoles.length >= 3,
  );
  // Step 4: Attempt to update permissions for each built-in role and verify rejection
  const validPermissionCodes = ["employee:view", "project:view", "report:view"];
  for (const builtinRole of builtinRoles) {
    await TestValidator.httpError(
      `updating built-in role '${builtinRole.name}' permissions should be rejected with 422`,
      422,
      async () => {
        await api.functional.erpHrm.member.organizations.roles.permissions.update(
          memberConnection,
          {
            organizationId: organization.id,
            roleId: builtinRole.id,
            body: {
              permissionCodes: validPermissionCodes,
            } satisfies IErpHrmRolePermission.IUpdate,
          },
        );
      },
    );
  }
}
