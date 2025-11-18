import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate successful user session refresh with a valid token.
 *
 * 1. Register a new user and obtain initial authorized session with tokens.
 * 2. Compose a proper token refresh request using the issued refresh token and
 *    required session context fields.
 * 3. POST /auth/user/refresh with the refresh payload.
 * 4. Verify the response is a valid IAuthorized structure (typia.assert).
 * 5. Confirm new tokens are issued (compare to originals: both token.access and
 *    token.refresh are different).
 * 6. User details are only those permitted (id, email, created_at, updated_at,
 *    token) with correct types (no extra exposure).
 * 7. Timestamps and tokens are valid.
 * 8. Ensure privacy and authentication compliance (no leakage of sensitive
 *    fields).
 */
export async function test_api_user_session_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Register user and get initial tokens
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/onboarding",
    referrer: "https://example.com/landing-page",
  } satisfies ITodoUser.IJoin;
  const initialAuth = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(initialAuth);

  // Step 2: Prepare refresh payload
  const refreshPayload = {
    refresh_token: initialAuth.token.refresh,
    ip: null,
    href: "https://example.com/refresh-token",
    referrer: "https://example.com/onboarding",
  } satisfies ITodoUser.IRefresh;

  // Step 3: POST to /auth/user/refresh
  const refreshedAuth = await api.functional.auth.user.refresh(connection, {
    body: refreshPayload,
  });
  typia.assert(refreshedAuth);

  // Step 4: Check response fields and token renewal
  TestValidator.predicate(
    "id is a uuid",
    typeof refreshedAuth.id === "string" &&
      refreshedAuth.id.length === initialAuth.id.length &&
      refreshedAuth.id !== "",
  );
  TestValidator.equals(
    "email matches original",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals("id matches original", refreshedAuth.id, initialAuth.id);
  TestValidator.notEquals(
    "refreshed token.access must change",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refreshed token.refresh must change",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  TestValidator.predicate(
    "access token string is valid",
    typeof refreshedAuth.token.access === "string" &&
      refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string is valid",
    typeof refreshedAuth.token.refresh === "string" &&
      refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is ISO 8601",
    typeof refreshedAuth.token.expired_at === "string" &&
      refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration is ISO 8601",
    typeof refreshedAuth.token.refreshable_until === "string" &&
      refreshedAuth.token.refreshable_until.length > 0,
  );

  // Step 5: Ensure only expected fields are present (privacy check)
  const expectedFields = ["id", "email", "created_at", "updated_at", "token"];
  TestValidator.equals(
    "No extraneous user fields in response",
    Object.keys(refreshedAuth).sort(),
    expectedFields.sort(),
  );
}
