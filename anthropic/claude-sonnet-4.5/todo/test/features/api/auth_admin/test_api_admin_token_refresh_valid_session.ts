import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates the admin token refresh flow for a valid, active session scenario.
 *
 * Business context: This test confirms that a newly registered and logged-in
 * admin can successfully refresh their authentication tokens using a valid,
 * non-expired refresh token while their session is active and the admin account
 * is enabled. It ensures the refresh operation upholds key business
 * requirements:
 *
 * - Refresh only succeeds if the admin is enabled (not disabled)
 * - Session must be valid and active
 * - Refresh token must match issued one and not be expired
 *
 * Step-by-step process:
 *
 * 1. Register a new admin account (POST /auth/admin/join), which issues a new set
 *    of tokens (access+refresh)
 * 2. Use the received refresh token in a POST /auth/admin/refresh call to request
 *    new tokens
 * 3. Validate that a new set of tokens is issued and profile matches
 *    ITodoListAdmin.IAuthorized
 * 4. Confirm that the received tokens are different than the first response
 *    (rotate)
 * 5. Assert business logic: tokens are present and match expected format, all
 *    required profile fields (id, email, created_at) are present and correctly
 *    typed/filled, and admin is still enabled
 */
export async function test_api_admin_token_refresh_valid_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.example.com/register",
    referrer: "https://admin-portal.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // Business validation for joinResult
  TestValidator.predicate(
    "received valid admin id (uuid)",
    typeof joinResult.id === "string" && joinResult.id.length > 0,
  );
  TestValidator.equals(
    "email matches join input",
    joinResult.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "token included in join result",
    !!joinResult.token && typeof joinResult.token.access === "string",
  );
  TestValidator.equals(
    "admin is enabled post-join",
    joinResult.disabled_at,
    null,
  );

  // Step 2: Use refresh token to get new set of tokens
  const refreshBody = {
    refresh_token: joinResult.token.refresh,
  } satisfies ITodoListAdmin.IRefresh;

  const refreshResult = await api.functional.auth.admin.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshResult);

  // Step 3: Validate returned profile and token (must match ITodoListAdmin.IAuthorized)
  TestValidator.predicate(
    "received valid admin id (uuid) after refresh",
    typeof refreshResult.id === "string" && refreshResult.id.length > 0,
  );
  TestValidator.equals(
    "email remains the same after refresh",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "admin is enabled after refresh",
    refreshResult.disabled_at,
    null,
  );
  TestValidator.predicate(
    "token included in refresh result",
    !!refreshResult.token && typeof refreshResult.token.access === "string",
  );
  TestValidator.notEquals(
    "new tokens are rotated after refresh (different than join)",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens are rotated after refresh",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
}
