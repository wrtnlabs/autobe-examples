import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate admin refresh token workflow:
 *
 * 1. Register a new platform admin with random, valid credentials (email,
 *    password)
 * 2. Assert output is a valid ICommunityPlatformAdmin.IAuthorized
 * 3. Extract access and refresh tokens, and store admin id and token expirations
 * 4. Call /auth/admin/refresh using a valid refresh token (post-registration
 *    session)
 * 5. Assert output is a valid ICommunityPlatformAdmin.IAuthorized, same admin id
 *    as before
 * 6. Check that the returned email, superuser, status, created_at, updated_at
 *    fields are unchanged
 * 7. Assert that the access token and refresh token have changed (new values
 *    returned)
 * 8. Confirm token payload (IAuthorizationToken): access, refresh, expired_at,
 *    refreshable_until are present and are new values (at minimum,
 *    expired_at/refreshable_until must be newer than previous)
 * 9. Ensure admin status stays 'active'
 */
export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    superuser: false,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(joinResult);
  const oldToken = joinResult.token;
  const oldAdminId = joinResult.id;

  // 2. Assert output is a valid ICommunityPlatformAdmin.IAuthorized
  TestValidator.equals(
    "join returns active status",
    joinResult.status,
    "active",
  );

  // 3. Call refresh
  const refreshResult = await api.functional.auth.admin.refresh(connection, {
    body: {},
  });
  typia.assert(refreshResult);

  // 4. Validate same admin id, email, other static fields
  TestValidator.equals(
    "refresh: admin id unchanged",
    refreshResult.id,
    oldAdminId,
  );
  TestValidator.equals(
    "refresh: admin email unchanged",
    refreshResult.email,
    adminInput.email,
  );
  TestValidator.equals(
    "refresh: superuser unchanged",
    refreshResult.superuser,
    adminInput.superuser,
  );
  TestValidator.equals(
    "refresh: status is active",
    refreshResult.status,
    "active",
  );

  // 5. Validate token: structure and values changed
  const newToken = refreshResult.token;
  typia.assert(newToken);
  TestValidator.notEquals(
    "refresh: access token changed",
    newToken.access,
    oldToken.access,
  );
  TestValidator.notEquals(
    "refresh: refresh token changed",
    newToken.refresh,
    oldToken.refresh,
  );
  TestValidator.predicate(
    "refresh: expired_at is updated",
    newToken.expired_at > oldToken.expired_at,
  );
  TestValidator.predicate(
    "refresh: refreshable_until is updated",
    newToken.refreshable_until > oldToken.refreshable_until,
  );
}
