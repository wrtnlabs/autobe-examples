import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Ensure password change requires authentication (unauthenticated must fail).
 *
 * This test validates that the community owner password change endpoint
 * strictly requires authentication. It performs the operation with an
 * unauthenticated connection and expects an authentication/authorization error,
 * typically 401 or 403 per spec. Because the request is unauthenticated, the
 * operation must not succeed and therefore must not return any authorization
 * token structure.
 *
 * Steps
 *
 * 1. Build an unauthenticated connection (clone base connection with empty
 *    headers)
 * 2. Prepare a valid-shaped password change body (current_password, new_password)
 * 3. Call PUT /auth/communityOwner/password and assert HTTP error (401/403)
 */
export async function test_api_community_owner_password_change_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection (do not manipulate headers beyond empty object)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a valid-shaped request body so failure is auth-related, not schema-related
  const changeBody = {
    current_password: `old_${RandomGenerator.alphaNumeric(8)}`,
    new_password: `new_${RandomGenerator.alphaNumeric(12)}`,
  } satisfies ICommunityPlatformCommunityOwner.IChangePassword;

  // 3) Expect authentication/authorization failure (401 or 403)
  await TestValidator.httpError(
    "password change requires authentication (401/403)",
    [401, 403],
    async () =>
      await api.functional.auth.communityOwner.password.changePassword(
        unauthConn,
        { body: changeBody },
      ),
  );
}
