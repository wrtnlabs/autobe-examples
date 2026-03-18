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
 * Test successfully updating permissions for a custom role.
 * Creates a custom role with initial permissions, then updates
 * its permissions to a new set, validating that the response contains
 * the updated permission matching the request.
 */
export async function test_api_role_permissions_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization for role management context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create custom role with initial permissions
  const customRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          { permission: "timesheet.approve" },
          { permission: "employee.view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(customRole);
  // Verify role is custom (not built-in)
  TestValidator.equals(
    "role is custom not built-in",
    customRole.isBuiltin,
    false,
  );
  // Update permissions to new set
  const updateBody = {
    permission: "project.view",
  } satisfies IErpHrmRolePermission.IUpdate;
  const updatedPermission =
    await api.functional.erpHrm.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: customRole.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPermission);
  // Validate response contains updated permission
  TestValidator.equals(
    "permission matches request",
    updatedPermission.permission,
    "project.view",
  );
  TestValidator.equals(
    "role ID matches",
    updatedPermission.roleId,
    customRole.id,
  );
}
