import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRefresh";

/**
 * Validate admin refresh behavior around token rotation and invalid refresh
 * tokens.
 *
 * This E2E test exercises the administrator authentication flows focused on
 * POST /auth/admin/login and POST /auth/admin/refresh. It validates that:
 *
 * 1. An administrator can log in with a valid IShoppingMallAdminLogin.ICreate
 *    payload and receive an IShoppingMallAdmin.IAuthorized response which
 *    includes a usable IAuthorizationToken pair.
 * 2. A subsequent POST /auth/admin/refresh call with a valid
 *    IShoppingMallAdminRefresh.ICreate payload using the issued refresh token
 *    successfully rotates tokens while preserving the administrator identity.
 * 3. A refresh attempt using an obviously invalid/forged refreshToken string is
 *    rejected, confirming that refresh is coupled to token and underlying state
 *    rather than arbitrary string input.
 *
 * Due to the constraints of the public API surface (only login and refresh
 * endpoints are exposed and no explicit admin status mutation APIs exist in
 * this context), direct manipulation of admin lifecycle flags (status,
 * deleted_at, email_verified) is not possible within this test. Instead, the
 * test reinterprets the "ineligible admin" scenario as an invalid refresh token
 * scenario: a refresh token that cannot be associated with a valid admin
 *
 * - Session state must be rejected by the backend.
 *
 * Business flow validated by this test:
 *
 * 1. Perform POST /auth/admin/login with realistic login/session metadata.
 * 2. Assert that the returned IShoppingMallAdmin.IAuthorized structure is valid
 *    and contains a non-empty refresh token.
 * 3. Perform POST /auth/admin/refresh with a valid
 *    IShoppingMallAdminRefresh.ICreate using the issued refresh token and
 *    realistic href/referrer/ip context.
 * 4. Assert that the returned authorization payload is valid, that the
 *    administrator id remains the same, and that the new access token differs
 *    from the original (token rotation semantics).
 * 5. Perform POST /auth/admin/refresh again but this time with a clearly
 *    forged/random refreshToken string that does not match the issued one,
 *    while still providing valid URI and IP shapes.
 * 6. Wrap this forged refresh call in TestValidator.error to assert that it fails,
 *    modeling the requirement that refresh must be rejected when the backend
 *    considers the underlying admin/session combination ineligible.
 */
export async function test_api_admin_refresh_rejected_for_ineligible_admin_status(
  connection: api.IConnection,
) {
  // 1. Administrator login to obtain initial tokens and identity
  const loginBody = typia.random<IShoppingMallAdminLogin.ICreate>();

  const loginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(loginResult);

  const originalToken: IAuthorizationToken = loginResult.token;
  typia.assert<IAuthorizationToken>(originalToken);

  // 2. Successful refresh using the issued refresh token
  const validRefreshBody = {
    refreshToken: originalToken.refresh,
    ip: loginBody.ip,
    href: loginBody.href,
    referrer: loginBody.referrer,
  } satisfies IShoppingMallAdminRefresh.ICreate;

  const refreshed: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // Business assertions on rotation and identity continuity
  TestValidator.equals(
    "admin id must remain the same after refresh",
    refreshed.id,
    loginResult.id,
  );

  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedToken.access,
    originalToken.access,
  );

  // 3. Negative scenario: refresh with an obviously invalid/forged refreshToken
  const forgedRefreshBody = {
    refreshToken: RandomGenerator.alphaNumeric(64),
    ip: loginBody.ip,
    href: loginBody.href,
    referrer: loginBody.referrer,
  } satisfies IShoppingMallAdminRefresh.ICreate;

  await TestValidator.error("refresh with forged token must fail", async () => {
    await api.functional.auth.admin.refresh(connection, {
      body: forgedRefreshBody,
    });
  });
}
