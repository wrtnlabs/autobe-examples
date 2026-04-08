import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a regular administrator is denied access when attempting to retrieve another administrator's account details.
 *
 * Validates the security constraint that prevents regular administrators from accessing the admin details endpoint. This endpoint (GET /ecommerceMall/admin/admin/admins/{adminId}) is exclusively reserved for super administrators to view administrative accounts.
 *
 * The test workflow:
 * 1. Super administrator registers and authenticates to create a target admin account
 * 2. Regular administrator registers and authenticates to perform unauthorized access attempt
 * 3. Regular admin attempts to retrieve admin account details
 * 4. Server responds with 403 Forbidden indicating insufficient privileges
 *
 * This test ensures proper role-based access control (RBAC) where regular administrators cannot enumerate or view other administrative accounts.
 */
export async function test_api_admin_details_retrieval_denied_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create and authenticate as regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {});
  // 3. Regular admin attempts to retrieve admin details (should be denied)
  await TestValidator.httpError(
    "regular admin denied access to admin details endpoint",
    403,
    async () =>
      await api.functional.ecommerceMall.admin.admin.admins.at(
        regularAdminConnection,
        {
          adminId: regularAdmin.id,
        },
      ),
  );
}
