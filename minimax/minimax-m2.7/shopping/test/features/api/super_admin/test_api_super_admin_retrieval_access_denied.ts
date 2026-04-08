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
 * Test that regular administrators cannot access super administrator details (access control).
 *
 * Validates the hierarchical access control between admin and super admin roles. Ensures that regular administrators are properly denied access when attempting to retrieve super administrator account details. This test verifies that the system correctly enforces exclusive access control for super admin resources.
 *
 * **Access Control Enforcement:**
 * The GET /superAdmin/super-admins/{superAdminId} endpoint is restricted exclusively to super administrators. Regular administrators lack the necessary privileges to view any super admin information, even if they possess a valid superAdminId.
 *
 * 1. Super admin registers and authenticates to obtain a valid superAdminId.
 * 2. Regular admin registers and authenticates to obtain admin session.
 * 3. Admin attempts to retrieve super admin details using the endpoint.
 * 4. System returns HTTP 403 Forbidden - access denied.
 * 5. Super admin details remain confidential from non-super-admin users.
 */
export async function test_api_super_admin_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super admin to obtain a valid superAdminId
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: `super_${RandomGenerator.alphabets(8)}@test.com`,
      password: "TestPassword123!",
    },
  });
  typia.assert(superAdmin);
  const superAdminId = superAdmin.id;
  // 2. Register and authenticate as a regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com`,
      password: "TestPassword123!",
    },
  });
  typia.assert(admin);
  // 3. Admin attempts to retrieve super admin details - expect 403 Forbidden
  await TestValidator.httpError(
    "regular admin cannot access super admin details",
    403,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admins.at(
        adminConnection,
        {
          superAdminId: superAdminId,
        },
      ),
  );
}