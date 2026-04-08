import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test retrieving a custom role to verify role details and permissions are returned correctly.
 *
 * Steps:
 * 1. Authenticate as a member via authorize_member_join
 * 2. Set organization context via generate_random_erp_hrm_member_organization_context_select
 * 3. Create a custom role via generate_random_erp_hrm_admin_roles_create with specific permissions
 * 4. Retrieve the custom role via GET /erpHrm/member/roles/{roleId}
 *
 * Validation points:
 * - Response status is 200 OK
 * - Response body matches IErpHrmRole.IInvert structure
 * - isBuiltin field is false for custom role
 * - name matches the custom role name provided during creation
 * - permissions array contains exactly the permissions assigned during creation
 * - role belongs to the current organization from session context
 */
export async function test_api_role_retrieval_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 2. Set organization context
  const memberContextConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  const context =
    await generate_random_erp_hrm_member_organization_context_select(
      memberContextConnection,
      {},
    );
  // 3. Create a custom role with specific permissions
  const customRoleName = `Custom Role ${RandomGenerator.alphaNumeric(8)}`;
  const customPermissions = ["project:view", "time:view_all"] as const;
  const createdRole = await generate_random_erp_hrm_admin_roles_create(
    memberContextConnection,
    {
      body: {
        name: customRoleName,
        permissions: [...customPermissions],
      },
    },
  );
  typia.assert(createdRole);
  // 4. Retrieve the custom role
  const retrievedRole = await api.functional.erpHrm.member.roles.at(
    memberContextConnection,
    {
      roleId: createdRole.id,
    },
  );
  typia.assert(retrievedRole);
  // 5. Validate business logic
  TestValidator.equals(
    "isBuiltin should be false for custom role",
    retrievedRole.isBuiltin,
    false,
  );
  TestValidator.equals(
    "name should match custom role name",
    retrievedRole.name,
    customRoleName,
  );
  TestValidator.equals(
    "organization should match context",
    retrievedRole.organization.id,
    context.organization.id,
  );
  // Validate permissions match exactly
  const retrievedPermissionCodes = retrievedRole.permissions
    .map((p) => p.permission)
    .sort();
  const expectedPermissionCodes = [...customPermissions].sort();
  TestValidator.equals(
    "permissions should match exactly",
    retrievedPermissionCodes,
    expectedPermissionCodes,
  );
}
