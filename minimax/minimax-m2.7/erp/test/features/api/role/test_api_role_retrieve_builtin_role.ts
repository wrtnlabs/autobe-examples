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

export async function test_api_role_retrieve_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Retrieve a built-in role by its UUID
  // Using a known built-in role ID (Manager role)
  const managerRoleId = "00000000-0000-0000-0000-000000000002" as string &
    tags.Format<"uuid">;
  const role = await api.functional.erpHrm.admin.roles.at(adminConnection, {
    roleId: managerRoleId,
  });
  typia.assert(role);
  // 3. Validate built-in role properties
  TestValidator.equals("role id matches", role.id, managerRoleId);
  TestValidator.equals("role name is Manager", role.name, "Manager");
  TestValidator.predicate("is_builtin is true", role.is_builtin === true);
  TestValidator.predicate("has valid created_at", role.created_at.length > 0);
  TestValidator.predicate("has valid updated_at", role.updated_at.length > 0);
  TestValidator.predicate(
    "has organization summary",
    role.organization !== undefined,
  );
  TestValidator.predicate(
    "has empty or valid rolePermissions array",
    Array.isArray(role.rolePermissions),
  );
}
