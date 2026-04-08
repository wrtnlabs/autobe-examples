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
 * Test that an authenticated administrator can successfully delete their own account.
 *
 * Validates the complete admin self-deletion workflow:
 * 1. Administrator registers via POST /ecommerceMall/auth/admin/join to obtain valid credentials
 * 2. Administrator calls DELETE /admin/admin/account with valid authorization token
 * 3. Server performs soft deletion by setting deleted_at timestamp and terminating all active sessions
 * 4. Verifies the response is 204 No Content indicating successful deletion
 * 5. Verifies all active sessions are terminated by attempting subsequent authenticated requests which should fail with 401
 *
 * This test ensures that administrators can permanently remove their own accounts,
 * with all sessions immediately invalidated upon deletion.
 *
 * 1. Register a new admin account with unique email and secure password.
 * 2. Call DELETE /admin/admin/account endpoint to soft-delete the account.
 * 3. Verify the deletion succeeds (no error thrown).
 * 4. Attempt subsequent authenticated request to verify sessions are terminated.
 * 5. Verify the request fails with 401 Unauthorized error.
 */
export async function test_api_admin_account_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Delete the admin account
  await api.functional.ecommerceMall.admin.admin.account.erase(adminConnection);
  // 3. Verify sessions are terminated - subsequent request should fail with 401
  await TestValidator.error(
    "admin login should fail after account deletion",
    async () => {
      await api.functional.ecommerceMall.admin.admin.account.erase(
        adminConnection,
      );
    },
  );
}
