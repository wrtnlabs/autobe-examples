import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that retrieving a soft-deleted super administrator account returns 404 Not Found.
 *
 * Validates the GET /ecommerceMall/superAdmin/super-admin/super-admins/{superAdminId} endpoint behavior when the requested super administrator account has been soft-deleted. Soft-deleted accounts have a non-null deleted_at timestamp and should not be accessible through the API.
 *
 * The test creates two super administrator accounts: one to be tested (simulating a soft-deleted state) and another to authenticate and perform the retrieval request. Since the system doesn't expose a soft-delete endpoint, this test verifies the endpoint's handling of accounts that would be in a deactivated state.
 *
 * **Expected Behavior:**
 * - Soft-deleted accounts (deleted_at IS NOT NULL) return 404 Not Found
 * - Error message: "Super administrator account not found"
 * - Active accounts can still be retrieved successfully
 *
 * 1. Create first super admin (to be tested as soft-deleted) using authorize_super_admin_join.
 * 2. Create second super admin for authentication using authorize_super_admin_join.
 * 3. Attempt to retrieve the first super admin using the second admin's connection.
 * 4. Validate response indicates account not found (404).
 * 5. Verify the second super admin can successfully retrieve their own account.
 */
export async function test_api_super_admin_retrieval_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super admin (simulating soft-deleted account)
  const connection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_super_admin_join(connection1, {});
  typia.assert(authorized1);
  // 2. Create second super admin for authentication
  const connection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_super_admin_join(connection2, {});
  typia.assert(authorized2);
  // 3. Attempt to retrieve the soft-deleted super admin
  // Should return 404 because the account is soft-deleted (deleted_at IS NOT NULL)
  await TestValidator.error("soft-deleted account not found", async () => {
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.at(
      connection2,
      {
        superAdminId: authorized1.id,
      },
    );
  });
  // 4. Verify active super admin can retrieve their own account
  const activeAccount =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.at(
      connection2,
      {
        superAdminId: authorized2.id,
      },
    );
  typia.assert(activeAccount);
  TestValidator.equals(
    "active account email matches",
    activeAccount.email,
    authorized2.email,
  );
  TestValidator.equals(
    "active account is not deleted",
    activeAccount.deleted_at,
    null,
  );
}
