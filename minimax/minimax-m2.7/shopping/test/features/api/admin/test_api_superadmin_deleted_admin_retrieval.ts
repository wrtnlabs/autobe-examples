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
 * Test that retrieving details for a soft-deleted (or non-existent) administrator returns a 404 error.
 *
 * Validates the admin retrieval security behavior:
 * 1. Super administrator authenticates to access admin management endpoints
 * 2. Creates a test administrator account to verify active admins can be retrieved
 * 3. Attempts to retrieve an admin with a non-existent ID
 * 4. Verifies the system returns 404 Not Found, protecting data security
 *
 * This test ensures that only active administrator accounts can be retrieved
 * through the admin management API. Non-existent or soft-deleted accounts
 * return 404 to prevent information leakage.
 *
 * **Retrieval Security:**
 * - Active admins (deleted_at = null) can be retrieved
 * - Non-existent admins return 404
 * - Soft-deleted admins (deleted_at = timestamp) return 404
 * - This protects sensitive administrator information
 *
 * 1. Register and authenticate as super administrator
 * 2. Create test administrator account (positive test - should succeed)
 * 3. Generate non-existent admin ID
 * 4. Attempt GET /ecommerceMall/superAdmin/admins/{nonExistentId}
 * 5. Assert 404 response for non-existent ID
 */
export async function test_api_superadmin_deleted_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create test administrator account (positive test - verify active admins can be retrieved)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // Verify active admin can be retrieved successfully (200 OK)
  const activeAdmin = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(activeAdmin);
  TestValidator.equals(
    "active admin has null deleted_at",
    activeAdmin.deleted_at,
    null,
  );
  // 3. Generate a non-existent admin ID (UUID that never existed)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve non-existent admin
  // Expected: 404 Not Found
  await TestValidator.httpError(
    "non-existent admin returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.admins.at(
        superAdminConnection,
        {
          adminId: nonExistentId,
        },
      );
    },
  );
}
