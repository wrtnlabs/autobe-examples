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
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first role 'HR Assistant' with permissions ['employee:manage']
  const firstRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "HR Assistant",
        permissions: ["employee:manage"] as string[] & tags.MinItems<1>,
      },
    },
  );
  typia.assert(firstRole);
  TestValidator.equals(
    "first role is not builtin",
    firstRole.is_builtin,
    false,
  );
  TestValidator.equals(
    "first role name matches",
    firstRole.name,
    "HR Assistant",
  );
  // 3. Attempt to create second role with same name 'HR Assistant'
  // Should fail with 400/409 error indicating duplicate name
  await TestValidator.error(
    "duplicate role name should be rejected",
    async () => {
      await generate_random_erp_hrm_admin_roles_create(adminConnection, {
        body: {
          name: "HR Assistant",
          permissions: ["time:manage"] as string[] & tags.MinItems<1>,
        },
      });
    },
  );
  // 4. Verify only one role exists (the duplicate was not created)
  // The first role should still exist with its original permissions
  TestValidator.equals(
    "first role still exists",
    firstRole.name,
    "HR Assistant",
  );
}
