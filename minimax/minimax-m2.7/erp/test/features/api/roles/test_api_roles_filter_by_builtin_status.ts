import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_roles_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Get built-in roles (isBuiltin=true)
  const builtinRolesResponse = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        isBuiltin: true,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(builtinRolesResponse);
  // 3. Get custom roles (isBuiltin=false)
  const customRolesResponse = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        isBuiltin: false,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(customRolesResponse);
  // 4. Validate built-in roles
  TestValidator.equals(
    "has builtin roles",
    builtinRolesResponse.data.length > 0,
    true,
  );
  // Verify all returned roles are built-in
  for (const role of builtinRolesResponse.data) {
    TestValidator.equals(`${role.name} is builtin`, role.isBuiltin, true);
  }
  // 5. Validate custom roles
  for (const role of customRolesResponse.data) {
    TestValidator.equals(`${role.name} is not builtin`, role.isBuiltin, false);
  }
  // 6. Verify built-in and custom roles are mutually exclusive
  const builtinRoleIds = new Set(builtinRolesResponse.data.map((r) => r.id));
  const customRoleIds = new Set(customRolesResponse.data.map((r) => r.id));
  for (const id of builtinRoleIds) {
    TestValidator.equals(
      "builtin id not in custom roles",
      customRoleIds.has(id),
      false,
    );
  }
  for (const id of customRoleIds) {
    TestValidator.equals(
      "custom id not in builtin roles",
      builtinRoleIds.has(id),
      false,
    );
  }
}
