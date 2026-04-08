import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that unauthenticated requests to delete admin account are properly rejected.
 *
 * Validates the security requirement that only authenticated administrators can delete their own accounts. This test ensures that:
 *
 * - Unauthenticated DELETE requests to /admin/admin/account return 401 Unauthorized
 * - No account deletion occurs when no authorization is provided
 * - The endpoint properly protects against unauthenticated access attempts
 *
 * 1. Create an admin account via join endpoint to establish valid credentials.
 * 2. Create a new connection WITHOUT authentication headers.
 * 3. Attempt to call DELETE /admin/admin/account with the unauthenticated connection.
 * 4. Verify the request fails with 401 Unauthorized error.
 */
export async function test_api_admin_account_deletion_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an admin account first (establishing that deletion would work if authenticated)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a completely unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Ensure no headers are set
  unauthenticatedConnection.headers = undefined;
  // 3. Attempt to delete admin account without authentication
  // 4. Verify that the request is rejected with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated delete should return 401",
    401,
    async () => {
      await api.functional.ecommerceMall.admin.admin.account.erase(
        unauthenticatedConnection,
      );
    },
  );
}
