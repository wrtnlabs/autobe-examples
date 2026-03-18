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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_permissions_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (auto-becomes owner of any org they create)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (member becomes owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with initial permissions
  const initialPermissions = ["employee:view", "project:view"];
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          permissions: initialPermissions,
        },
      },
    );
  typia.assert(customRole);
  // Verify initial role setup
  TestValidator.predicate(
    "initial role is not builtin",
    customRole.isBuiltin === false,
  );
  // Step 4: Update permissions - replace with a new set
  const newPermissions = [
    "org:manage",
    "employee:manage",
    "time:approve",
    "report:view",
  ];
  const updatedRole =
    await api.functional.erpHrm.member.organizations.roles.permissions.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: customRole.id,
        body: {
          permissionCodes: newPermissions,
        } satisfies IErpHrmRolePermission.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // Verify updated role properties
  TestValidator.predicate(
    "updated role is not builtin",
    updatedRole.isBuiltin === false,
  );
  TestValidator.equals("role id matches", updatedRole.id, customRole.id);
  TestValidator.equals(
    "organization id matches",
    updatedRole.organizationId,
    organization.id,
  );
  // Verify the new permissions are exactly those requested
  const updatedPermCodes = updatedRole.permissions
    .map((p) => p.permission_code)
    .sort();
  const expectedNewPerms = [...newPermissions].sort();
  TestValidator.equals(
    "permission count matches new set",
    updatedRole.permissions.length,
    newPermissions.length,
  );
  TestValidator.equals(
    "permission codes match exactly",
    updatedPermCodes,
    expectedNewPerms,
  );
  // Verify old permissions are gone
  const hasOldEmployeeView = updatedPermCodes.includes("employee:view");
  TestValidator.predicate(
    "old permission employee:view is gone",
    hasOldEmployeeView === false,
  );
  const hasOldProjectView = updatedPermCodes.includes("project:view");
  TestValidator.predicate(
    "old permission project:view is gone",
    hasOldProjectView === false,
  );
  // Step 5: Additional validation - assign all 9 valid permission codes
  const allPermissions = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  const fullPermRole =
    await api.functional.erpHrm.member.organizations.roles.permissions.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: customRole.id,
        body: {
          permissionCodes: allPermissions,
        } satisfies IErpHrmRolePermission.IUpdate,
      },
    );
  typia.assert(fullPermRole);
  // Verify all 9 permissions are assigned
  const fullPermCodes = fullPermRole.permissions
    .map((p) => p.permission_code)
    .sort();
  const expectedAllPerms = [...allPermissions].sort();
  TestValidator.equals(
    "all 9 permissions assigned",
    fullPermRole.permissions.length,
    allPermissions.length,
  );
  TestValidator.equals(
    "all permission codes match",
    fullPermCodes,
    expectedAllPerms,
  );
  TestValidator.predicate(
    "full perm role is not builtin",
    fullPermRole.isBuiltin === false,
  );
}
