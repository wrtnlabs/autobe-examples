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

export async function test_api_permissions_list_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account using utility function
  const authorized: IErpHrmAdmin.IAuthorized = await authorize_admin_join(
    connection,
    {},
  );
  // 2. Create admin-specific connection with auth token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 3. Retrieve permissions list
  const output =
    await api.functional.erpHrm.admin.permissions.list(adminConnection);
  typia.assert(output);
  // 4. Validate response structure
  TestValidator.predicate("items array exists", output.items !== undefined);
  TestValidator.predicate("items array is not empty", output.items.length > 0);
  // 5. Validate permission codes follow 'resource:action' pattern
  for (const item of output.items) {
    TestValidator.predicate(
      `permission '${item.permission}' matches pattern resource:action`,
      /^[a-z]+:[a-z_]+$/.test(item.permission),
    );
  }
  // 6. Verify expected system permissions exist
  const permissionCodes = output.items.map((p) => p.permission);
  TestValidator.equals(
    "contains org:manage",
    permissionCodes.includes("org:manage"),
    true,
  );
  TestValidator.equals(
    "contains employee:manage",
    permissionCodes.includes("employee:manage"),
    true,
  );
  TestValidator.equals(
    "contains employee:view",
    permissionCodes.includes("employee:view"),
    true,
  );
  TestValidator.equals(
    "contains project:manage",
    permissionCodes.includes("project:manage"),
    true,
  );
  TestValidator.equals(
    "contains project:view",
    permissionCodes.includes("project:view"),
    true,
  );
  TestValidator.equals(
    "contains time:manage",
    permissionCodes.includes("time:manage"),
    true,
  );
  TestValidator.equals(
    "contains time:approve",
    permissionCodes.includes("time:approve"),
    true,
  );
  TestValidator.equals(
    "contains time:view_all",
    permissionCodes.includes("time:view_all"),
    true,
  );
  TestValidator.equals(
    "contains report:view",
    permissionCodes.includes("report:view"),
    true,
  );
}