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

export async function test_api_permissions_includes_all_system_codes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // 2. Call permissions list endpoint
  const permissionsList =
    await api.functional.erpHrm.admin.permissions.list(adminConnection);
  typia.assert(permissionsList);
  // 3. Define all nine system permission codes
  const systemPermissionCodes = [
    "employee:manage",
    "employee:view",
    "org:manage",
    "project:manage",
    "project:view",
    "report:view",
    "time:approve",
    "time:manage",
    "time:view_all",
  ] as const;
  // 4. Extract permission codes from response items
  const foundPermissionCodes = permissionsList.items.map(
    (item) => item.permission,
  );
  // 5. Verify all expected permission codes are present
  for (const expectedCode of systemPermissionCodes) {
    TestValidator.equals(
      `permission "${expectedCode}" exists`,
      foundPermissionCodes.includes(expectedCode),
      true,
    );
  }
  // 6. Verify each permission has valid role object
  for (const item of permissionsList.items) {
    TestValidator.predicate(
      `permission "${item.permission}" has valid role_id`,
      item.role.id !== undefined && item.role.id.length > 0,
    );
    TestValidator.predicate(
      `permission "${item.permission}" has valid role_name`,
      item.role.name !== undefined && item.role.name.length > 0,
    );
  }
  // 7. Verify response has items
  TestValidator.predicate(
    "permissions list has items",
    permissionsList.items.length > 0,
  );
}
