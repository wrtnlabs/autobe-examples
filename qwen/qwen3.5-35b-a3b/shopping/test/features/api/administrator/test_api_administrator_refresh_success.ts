import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the primary success path for administrator token refresh operation.
 *
 * Validates the complete token refresh flow including administrator account creation,
 * initial login, and token refresh with proper validation of response structure,
 * token expiration times, and session integrity. Ensures that the refresh token
 * successfully generates new access credentials while maintaining session continuity.
 *
 * Special attention is given to verifying that all response fields are correctly
 * populated, token expiration times are within expected ranges, and the new tokens
 * can be used for subsequent API calls. The test also validates that the old
 * refresh token becomes invalid after refresh, implementing proper token rotation.
 *
 * 1. Administrator joins to create a new admin account with valid credentials.
 * 2. Administrator logs in to establish an authenticated session and obtain refresh token.
 * 3. Administrator calls refresh endpoint with the valid refresh token from step 2.
 * 4. Verify the response returns new access and refresh tokens with correct structure.
 * 5. Verify the administrator account information is included and matches original data.
 * 6. Verify the new tokens have appropriate expiration times within expected ranges.
 * 7. Verify the session record has been updated with new tokens.
 * 8. Verify the old refresh token is no longer valid for authentication.
 */
export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Registration credentials for reuse in login
  const credentials = {
    display_name: RandomGenerator.name(3),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "regular",
  } satisfies IEcommerceMallAdministrator.IJoin;
  // Step 1: Create administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(joinConnection, {
    body: credentials,
  });
  typia.assert(joinResult);
  // Store original account info
  const originalGrade = joinResult.grade;
  const originalEmail = joinResult.email;
  const originalId = joinResult.id;
  const originalDisplayName = joinResult.display_name;
  // Step 2: Login to get initial session with refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: {
      email: originalEmail,
      password: credentials.password,
      ip: "127.0.0.1",
      referrer: "http://localhost/admin",
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  typia.assert(loginResult);
  // Store refresh token from login
  const originalRefreshToken = loginResult.token.refresh;
  // Step 3: Refresh tokens using the refresh token from step 2
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IEcommerceMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // Step 4: Verify response structure matches expectations
  TestValidator.equals(
    "refresh response has correct structure",
    {
      id: originalId,
      email: originalEmail,
      display_name: originalDisplayName,
      grade: originalGrade,
      is_banned: joinResult.is_banned,
      created_at: joinResult.created_at,
      updated_at: joinResult.updated_at,
      deleted_at: joinResult.deleted_at,
      token: null as unknown as IAuthorizationToken,
    },
    {
      id: refreshResult.id,
      email: refreshResult.email,
      display_name: refreshResult.display_name,
      grade: refreshResult.grade,
      is_banned: refreshResult.is_banned,
      created_at: refreshResult.created_at,
      updated_at: refreshResult.updated_at,
      deleted_at: refreshResult.deleted_at,
      token: null as unknown as IAuthorizationToken,
    },
  );
  // Step 5: Verify token object structure and values
  const token = refreshResult.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token is valid JWT string",
    token.access.length > 50,
  );
  TestValidator.predicate(
    "refresh token is valid JWT string",
    token.refresh.length > 50,
  );
  TestValidator.predicate(
    "expired_at is valid ISO timestamp",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO timestamp",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  // Step 6: Verify token expiration times are within expected ranges
  const now = new Date().getTime();
  const expiredAt = Date.parse(token.expired_at);
  const refreshableUntil = Date.parse(token.refreshable_until);
  // Access token should expire within 15-60 minutes (900000-3600000 milliseconds)
  const accessTokenLifetime = expiredAt - now;
  TestValidator.predicate(
    "access token expires within 15-60 minutes",
    accessTokenLifetime >= 900000 && accessTokenLifetime <= 3600000,
  );
  // Refresh token should be valid for 7-30 days (604800000-2592000000 milliseconds)
  const refreshTokenLifetime = refreshableUntil - now;
  TestValidator.predicate(
    "refresh token valid for 7-30 days",
    refreshTokenLifetime >= 604800000 && refreshTokenLifetime <= 2592000000,
  );
  // Step 7: Verify account information matches original
  TestValidator.equals(
    "administrator ID unchanged",
    refreshResult.id,
    originalId,
  );
  TestValidator.equals(
    "administrator email unchanged",
    refreshResult.email,
    originalEmail,
  );
  TestValidator.equals(
    "administrator grade unchanged",
    refreshResult.grade,
    originalGrade,
  );
  TestValidator.equals(
    "administrator is_banned status unchanged",
    refreshResult.is_banned,
    joinResult.is_banned,
  );
  TestValidator.equals(
    "administrator display_name unchanged",
    refreshResult.display_name,
    originalDisplayName,
  );
  // Step 8: Verify old refresh token is no longer valid after refresh
  await TestValidator.error(
    "old refresh token should be invalid after refresh",
    async () => {
      await authorize_administrator_refresh(refreshConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IEcommerceMallAdministrator.IRefresh,
      });
    },
  );
  // Step 9: Verify new refresh token works for subsequent API calls
  const newRefreshToken = refreshResult.token.refresh;
  await authorize_administrator_refresh(refreshConnection, {
    body: {
      refresh_token: newRefreshToken,
    } satisfies IEcommerceMallAdministrator.IRefresh,
  });
}