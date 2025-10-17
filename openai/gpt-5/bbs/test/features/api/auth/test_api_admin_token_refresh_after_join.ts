import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Validate administrator token refresh rotation after join.
 *
 * Business goals
 *
 * - Ensure a newly joined admin receives a valid token set
 * - Ensure POST /auth/admin/refresh rotates tokens and preserves admin scope
 * - Validate subject id consistency and optional role claim
 * - Optionally verify invalid refresh token is rejected (error is thrown)
 *
 * Steps
 *
 * 1. Join as admin and capture IEconDiscussAdmin.IAuthorized
 * 2. Refresh using the returned refresh token
 * 3. Validate:
 *
 *    - Response shapes via typia.assert
 *    - Same subject id between join and refresh
 *    - If role claim exists, it is "admin"
 *    - Access token rotation (new access != old access)
 *    - Refresh token rotation if policy rotates it (optional check)
 * 4. Negative path (optional): refresh with an invalid token should throw
 */
export async function test_api_admin_token_refresh_after_join(
  connection: api.IConnection,
) {
  // 1) Admin join: create account and obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  if (authorized.role !== undefined) {
    TestValidator.equals(
      "role claim is admin on join",
      authorized.role,
      "admin",
    );
  }
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.predicate(
    "join response contains non-empty access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response contains non-empty refresh token",
    authorized.token.refresh.length > 0,
  );

  // 2) Refresh: request token rotation using refresh token
  const refreshBody = {
    refreshToken: authorized.token.refresh,
  } satisfies IEconDiscussAdmin.IRefresh;

  const refreshed: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // 3) Validate subject id consistency and role preservation
  TestValidator.equals(
    "same subject id between join and refresh",
    refreshed.id,
    authorized.id,
  );
  if (refreshed.role !== undefined) {
    TestValidator.equals(
      "role claim is admin on refresh",
      refreshed.role,
      "admin",
    );
  }

  // Validate token shapes and business expectations
  typia.assert<IAuthorizationToken>(refreshed.token);
  TestValidator.predicate(
    "refresh response contains non-empty access token",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh response contains non-empty refresh token",
    refreshed.token.refresh.length > 0,
  );

  // Access token should be rotated on refresh
  TestValidator.notEquals(
    "access token must be rotated after refresh",
    refreshed.token.access,
    authorized.token.access,
  );

  // Refresh token rotation may depend on policy: if rotated, ensure different
  if (refreshed.token.refresh !== authorized.token.refresh) {
    TestValidator.notEquals(
      "refresh token rotated per policy",
      refreshed.token.refresh,
      authorized.token.refresh,
    );
  }

  // 4) Optional negative: invalid refresh token should fail (business error)
  await TestValidator.error(
    "refresh with invalid token should throw",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(64),
        } satisfies IEconDiscussAdmin.IRefresh,
      });
    },
  );
}
