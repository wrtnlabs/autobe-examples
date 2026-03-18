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
 * Test the primary success path where a member with role management permissions
 * retrieves detailed information about a permission assigned to a custom role.
 * First authenticate as a member and create an organization (becoming the owner
 * with full permissions). Then create a custom role using POST /erpHrm/member/roles
 * with name 'Test Role' and permissions like 'project.view'. Next assign an
 * additional permission using POST /erpHrm/member/roles/{roleId}/permissions with
 * permission identifier 'employee.view'. Finally retrieve the specific permission
 * using the permissionId returned from the creation response. Validate that the
 * response contains a complete IErpHrmRolePermission object with correct id,
 * roleId matching the path parameter, permission string 'employee.view', nested
 * role summary object with correct role details, and valid creation/update
 * timestamps. Also verify the deletedAt field is null indicating an active permission.
 */
export async function test_api_role_permission_retrieved_successfully(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create custom role with initial permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Test Role",
        permissions: [{ permission: "project.view" }],
      },
    },
  );
  typia.assert(role);
  // Assign additional permission
  const permission =
    await generate_random_erp_hrm_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: role.id },
        body: { permission: "employee.view" },
      },
    );
  typia.assert(permission);
  // Retrieve the specific permission
  const retrievedPermission =
    await api.functional.erpHrm.member.roles.permissions.at(memberConnection, {
      roleId: role.id,
      permissionId: permission.id,
    });
  typia.assert(retrievedPermission);
  // Validate the response
  TestValidator.equals(
    "permission id matches",
    retrievedPermission.id,
    permission.id,
  );
  TestValidator.equals(
    "roleId matches path parameter",
    retrievedPermission.roleId,
    role.id,
  );
  TestValidator.equals(
    "permission string is correct",
    retrievedPermission.permission,
    "employee.view",
  );
  TestValidator.equals(
    "deletedAt is null",
    retrievedPermission.deletedAt,
    null,
  );
  TestValidator.equals(
    "role summary id matches",
    retrievedPermission.role.id,
    role.id,
  );
  TestValidator.equals(
    "role summary name matches",
    retrievedPermission.role.name,
    role.name,
  );
}
