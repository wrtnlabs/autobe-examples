import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

/**
 * Validate JWT token refresh for a valid, unexpired refresh token.
 *
 * This test registers a new user, verifies their email, logs in to obtain
 * access and refresh tokens, and then sends the refresh token to the token
 * refresh endpoint. It checks that a new pair of tokens is issued and all API
 * responses match their expected types.
 *
 * 1. Register a new user (random email, password, display name, url/ref info)
 * 2. Complete email verification using the token from registration output
 * 3. Log in with the verified credentials (random IP/href/referrer included)
 * 4. Perform the refresh using the refresh token from login
 * 5. Assert that the response issues new valid tokens, and the user info matches
 */
export async function test_api_auth_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();
  const href: string = "https://test-host.example.com/welcome";
  const referrer: string = "https://test-host.example.com/register";
  const ip = typia.random<
    (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
  >();

  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      display_name: displayName as string &
        tags.MinLength<1> &
        tags.MaxLength<64>,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
      ip: ip,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(joinRes);
  TestValidator.equals("received email matches input", joinRes.email, email);
  TestValidator.predicate(
    "account is not yet verified",
    joinRes.is_verified === false,
  );

  // 2. Complete email verification (assuming a mock system where the token is given)
  const token = joinRes.token?.refresh ?? "";
  // Mock: in real system, the actual email verification token should be obtained from a sent email or DB
  // Here, simulate a system where registration returns a usable token property
  // Use the refresh token from joinRes.token.refresh (placeholder for real verification flow)
  const verifyRes = await api.functional.auth.user.verify_email.verifyEmail(
    connection,
    {
      body: {
        verification_token: token as string & tags.MinLength<1>,
      } satisfies ITodoListUserEmailVerification.IVerify,
    },
  );
  typia.assert(verifyRes);
  TestValidator.predicate(
    "email verification succeeded",
    verifyRes.success === true,
  );

  // 3. Log in with verified credentials to obtain initial tokens
  const loginRes = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
      ip: ip,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginRes);
  TestValidator.equals(
    "login response user id matches join response",
    loginRes.id,
    joinRes.id,
  );
  TestValidator.predicate(
    "login returns verified=true",
    loginRes.is_verified === true,
  );
  TestValidator.predicate(
    "login returns is_active=true",
    loginRes.is_active === true,
  );
  TestValidator.predicate(
    "login returns refresh token",
    typeof loginRes.token.refresh === "string" &&
      loginRes.token.refresh.length > 10,
  );

  // 4. Submit the refresh token to acquire a new access/refresh pair
  const refreshToken = loginRes.token.refresh;
  const refreshRes = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshRes);
  TestValidator.equals(
    "refresh user id matches login user id",
    refreshRes.id,
    loginRes.id,
  );
  TestValidator.predicate(
    "refresh response includes access token",
    typeof refreshRes.token.access === "string" &&
      refreshRes.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh response includes refresh token",
    typeof refreshRes.token.refresh === "string" &&
      refreshRes.token.refresh.length > 10,
  );
  TestValidator.notEquals(
    "refresh access token should differ from previous",
    refreshRes.token.access,
    loginRes.token.access,
  );
  TestValidator.notEquals(
    "refresh refresh token should differ from previous",
    refreshRes.token.refresh,
    loginRes.token.refresh,
  );
}
