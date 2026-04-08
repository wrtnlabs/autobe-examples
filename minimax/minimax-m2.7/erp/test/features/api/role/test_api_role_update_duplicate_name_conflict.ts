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

export async function test_api_role_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create first custom role with unique name
  const roleA = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:view", "project:view"],
      },
    },
  );
  typia.assert(roleA);
  // 3. Create second custom role with different name
  const roleB = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Different ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:view"],
      },
    },
  );
  typia.assert(roleB);
  // 4. Attempt to update second role with first role's name (should cause 409 Conflict)
  await TestValidator.httpError(
    "duplicate role name conflict",
    409,
    async () => {
      await api.functional.erpHrm.admin.roles.update(adminConnection, {
        roleId: roleB.id,
        body: {
          name: roleA.name,
          permissionCodes: ["employee:view"],
        } satisfies IErpHrmRole.IUpdate,
      });
    },
  );
}
