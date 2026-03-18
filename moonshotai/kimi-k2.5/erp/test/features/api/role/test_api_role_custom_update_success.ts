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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test successful update of a custom role's name and permissions.
 * The scenario authenticates as a member with role management permission,
 * creates an organization, creates a custom role with initial permissions,
 * then updates the role by changing both its name and permission set.
 * Validates that the response contains the updated role with new name,
 * new permissions, and preserved custom role status.
 */
export async function test_api_role_custom_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with role management capability
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization to provide context for role management
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with initial permissions
  const initialRoleName = `Initial ${RandomGenerator.name()}`;
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: initialRoleName,
        description: "Initial custom role for testing update functionality",
        permissions: [
          { permission: "employee.view" },
          { permission: "project.view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // Verify initial state - should be custom role (not built-in)
  TestValidator.predicate(
    "created role should be custom (not built-in)",
    !role.isBuiltin,
  );
  TestValidator.equals(
    "initial role name matches input",
    role.name,
    initialRoleName,
  );
  // 4. Update the custom role with new name and different permissions
  const updatedRoleName = `Updated ${RandomGenerator.name()}`;
  const updatedRole = await api.functional.erpHrm.member.roles.update(
    memberConnection,
    {
      roleId: role.id,
      body: {
        name: updatedRoleName,
        description: "Updated role description after modification",
        permissions: ["employee.manage", "project.manage", "organization.view"],
      } satisfies IErpHrmRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 5. Validate the response contains updated role with new name and preserved custom status
  TestValidator.equals("role ID should be preserved", updatedRole.id, role.id);
  TestValidator.equals(
    "role name should be updated",
    updatedRole.name,
    updatedRoleName,
  );
  TestValidator.equals(
    "role should remain custom (not built-in)",
    updatedRole.isBuiltin,
    false,
  );
  TestValidator.equals(
    "organization should be preserved",
    updatedRole.organization.id,
    organization.id,
  );
}
