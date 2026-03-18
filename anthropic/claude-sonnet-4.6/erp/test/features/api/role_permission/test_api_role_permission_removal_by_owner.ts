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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_organizations_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_permissions_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (becomes organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create an organization (owner is automatically assigned the Owner role)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with multiple permissions
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "Project Lead",
          permissions: ["project:manage", "project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // Step 4: Add an additional permission to the custom role and capture the permissionId
  const addedPermission =
    await generate_random_erp_hrm_member_organizations_roles_permissions_create(
      ownerConnection,
      {
        body: {
          permission_code: "time:view_all",
        },
        params: {
          organizationId: organization.id,
          roleId: customRole.id,
        },
      },
    );
  typia.assert(addedPermission);
  // Step 5: Primary test - Delete the added permission (should return void / 204 No Content)
  await api.functional.erpHrm.member.organizations.roles.permissions.erase(
    ownerConnection,
    {
      organizationId: organization.id,
      roleId: customRole.id,
      permissionId: addedPermission.id,
    },
  );
  // Step 6: Edge Case - Create another custom role with exactly one permission
  const singlePermissionRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "Viewer Only",
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(singlePermissionRole);
  // Verify the role was created with exactly one permission
  TestValidator.predicate(
    "single permission role has one permission",
    singlePermissionRole.permissions.length === 1,
  );
  // Safely access the single permission's ID
  const singlePermission = singlePermissionRole.permissions[0]!;
  // Step 7: Delete the last (only) permission - system should allow zero permissions
  await api.functional.erpHrm.member.organizations.roles.permissions.erase(
    ownerConnection,
    {
      organizationId: organization.id,
      roleId: singlePermissionRole.id,
      permissionId: singlePermission.id,
    },
  );
}
