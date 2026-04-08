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
 * Test that unauthenticated access to super admin profile endpoint is rejected with 401 Unauthorized.
 *
 * Validates the authentication guard protecting the super admin profile endpoint. This endpoint contains sensitive administrative account information that must not be accessible to unauthenticated users. The test ensures that requests without valid JWT tokens are properly rejected with HTTP 401 Unauthorized status.
 *
 * Security considerations:
 * - Protected endpoint requires valid JWT token from authenticated super admin session
 * - Missing or invalid Authorization header must result in authentication failure
 * - No sensitive account data (email, id, timestamps) should be exposed to unauthenticated users
 *
 * 1. Create connection WITHOUT any Authorization header (simulating unauthenticated request)
 * 2. Call GET /ecommerceMall/superAdmin/super-admins/me endpoint
 * 3. Validate HTTP 401 Unauthorized error is returned
 * 4. Verify error message indicates authentication is required
 */
export async function test_api_super_admin_profile_retrieval_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection WITHOUT authentication headers
  // This simulates an unauthenticated request to the protected endpoint
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  // Attempt to access super admin profile without authentication
  // Expect: 401 Unauthorized error
  await TestValidator.httpError(
    "unauthenticated access should return 401",
    401,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admins.me.at(
        unauthenticatedConnection,
      ),
  );
}
