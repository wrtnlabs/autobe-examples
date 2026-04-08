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

export async function test_api_custom_role_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using authorize_admin_join utility
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
  // 2. Create first custom role with a unique name using utility
  const roleName = RandomGenerator.alphabets(8);
  const firstRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: roleName,
        permissions: ["employee:view", "project:view"] as const,
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(firstRole);
  // 3. Verify first role was created with the expected name
  TestValidator.equals("first role name matches", firstRole.name, roleName);
  // 4. Attempt to create second role with duplicate name
  // 5. Verify this returns HTTP 409 Conflict using TestValidator.error
  await TestValidator.error("duplicate role name rejection", async () => {
    await generate_random_erp_hrm_admin_roles_create(adminConnection, {
      body: {
        name: roleName,
        permissions: ["employee:manage"] as const,
      } satisfies IErpHrmRole.ICreate,
    });
  });
}
