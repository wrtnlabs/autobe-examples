import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_roles_permissions_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Successfully delete a permission assignment from a custom role to revoke that capability from all members assigned to the role.
 *
 * ### Setup
 * 1. Authenticate as a new member using POST /erpHrm/auth/member/join
 * 2. Create an organization using POST /erpHrm/member/organizations (the creator automatically becomes Owner with organization.manage permission)
 * 3. Create a custom role using POST /erpHrm/member/roles with name 'Test Role' and permissions ['employee.view', 'project.view']
 * 4. Assign an additional permission to the custom role using POST /erpHrm/member/roles/{roleId}/permissions with permission 'employee.manage'
 *
 * ### Test Execution
 * 5. Execute DELETE /erpHrm/member/roles/{roleId}/permissions/{permissionId} using the roleId from step 3 and permissionId from step 4
 *
 * ### Expected Outcomes
 * - HTTP 204 No Content or success response indicating the permission was deleted
 * - The permission record is permanently removed from the database (hard delete)
 * - Members currently assigned to this custom role immediately lose the 'employee.manage' capability
 * - An activity log entry is created documenting the permission removal for audit purposes
 * - The role still exists with its remaining permissions ('employee.view', 'project.view')
 *
 * ### Validation Points
 * - Verify the permission no longer appears when retrieving the role's permission list
 * - Verify the operation succeeds only because the member has organization.manage permission as the Owner
 * - Verify the custom role is not affected beyond the removed permission
 */
export async function test_api_permission_delete_from_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (becomes Owner with organization.manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Create a custom role with initial permissions ['employee.view', 'project.view']
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Test Role",
        permissions: [
          { permission: "employee.view" },
          { permission: "project.view" },
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Assign an additional permission 'employee.manage' to the custom role
  const permissionToDelete =
    await generate_random_erp_hrm_member_roles_permissions_create(
      memberConnection,
      {
        body: {
          permission: "employee.manage",
        },
        params: {
          roleId: role.id,
        },
      },
    );
  typia.assert(permissionToDelete);
  // 5. Execute DELETE to remove the permission from the custom role
  await api.functional.erpHrm.member.roles.permissions.erase(memberConnection, {
    roleId: role.id,
    permissionId: permissionToDelete.id,
  });
}
