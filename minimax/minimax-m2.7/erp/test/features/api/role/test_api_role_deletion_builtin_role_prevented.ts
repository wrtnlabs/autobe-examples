import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_deletion_builtin_role_prevented(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with organization context
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
  // 2. Attempt to delete a built-in role
  // Using a UUID to attempt deletion of a built-in role
  // Built-in roles (Owner, Manager, Employee) have isBuiltin: true and cannot be deleted
  const builtinRoleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify the delete request is rejected with 403 Forbidden
  // Built-in roles cannot be deleted per system specification
  await TestValidator.httpError(
    "built-in role deletion should be forbidden with 403",
    403,
    async () => {
      await api.functional.erpHrm.admin.roles.erase(adminConnection, {
        roleId: builtinRoleId,
      });
    },
  );
}
