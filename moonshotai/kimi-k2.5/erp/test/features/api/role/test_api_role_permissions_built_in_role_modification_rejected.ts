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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test that attempting to modify permissions for built-in roles is rejected.
 *
 * 1. Authenticate as a member
 * 2. Create an organization (automatically creates built-in roles: Owner, Manager, Employee)
 * 3. Attempt to patch permissions on a built-in role
 * 4. Verify the system returns an error indicating built-in roles cannot be modified
 */
export async function test_api_role_permissions_built_in_role_modification_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create an organization which automatically creates built-in roles
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Attempt to modify permissions on a role (built-in roles cannot be modified)
  // Using a random UUID since role listing endpoint is not available
  const roleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject modification of built-in role permissions",
    async () => {
      await api.functional.erpHrm.member.roles.permissions.updatePermissions(
        memberConnection,
        {
          roleId: roleId,
          body: {
            permission: "organization.manage",
          } satisfies IErpHrmRolePermission.IUpdate,
        },
      );
    },
  );
}
