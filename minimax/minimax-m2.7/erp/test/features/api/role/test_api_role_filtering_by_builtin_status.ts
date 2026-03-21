import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_filtering_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - creates new organization with built-in roles
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Get built-in roles only (Owner, Manager, Employee)
  const builtInRolesResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        is_builtin: true,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(builtInRolesResponse);
  // 3. Validate built-in roles have is_builtin=true
  TestValidator.predicate(
    "should have at least built-in roles",
    builtInRolesResponse.data.length >= 3,
  );
  for (const role of builtInRolesResponse.data) {
    TestValidator.equals(
      "built-in role must have is_builtin=true",
      role.is_builtin,
      true,
    );
  }
  // 4. Get custom roles only
  const customRolesResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        is_builtin: false,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(customRolesResponse);
  // 5. Validate custom roles have is_builtin=false
  for (const role of customRolesResponse.data) {
    TestValidator.equals(
      "custom role must have is_builtin=false",
      role.is_builtin,
      false,
    );
  }
  // 6. Verify built-in roles are excluded when filtering by is_builtin=false
  const builtInRoleIds = new Set(builtInRolesResponse.data.map((r) => r.id));
  for (const customRole of customRolesResponse.data) {
    TestValidator.equals(
      "custom role should not be a built-in role",
      builtInRoleIds.has(customRole.id),
      false,
    );
  }
  // 7. Get all roles without filter for comparison
  const allRolesResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(allRolesResponse);
  // 8. Verify count consistency
  TestValidator.equals(
    "total roles equals built-in + custom roles",
    allRolesResponse.data.length,
    builtInRolesResponse.data.length + customRolesResponse.data.length,
  );
}
