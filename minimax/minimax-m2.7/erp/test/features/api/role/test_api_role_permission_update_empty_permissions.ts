import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_permission_update_empty_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a custom role with initial permissions
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:view", "project:view", "time:view_all"],
      },
    },
  );
  typia.assert(customRole);
  // 3. Verify role was created with permissions
  TestValidator.predicate(
    "role should have initial permissions before update",
    customRole.rolePermissions.length > 0,
  );
  // 4. Update the custom role's permissions to an empty array
  const updateResult =
    await api.functional.erpHrm.member.roles.permissions.updatePermissions(
      adminConnection,
      {
        roleId: customRole.id,
        body: {
          permissions: [],
        },
      },
    );
  typia.assert(updateResult);
  // 5. Validate the response
  TestValidator.equals(
    "permissions array should be empty",
    updateResult.permissions,
    [],
  );
  TestValidator.equals(
    "role permissionsCount should be 0",
    updateResult.role.permissionsCount,
    0,
  );
}
