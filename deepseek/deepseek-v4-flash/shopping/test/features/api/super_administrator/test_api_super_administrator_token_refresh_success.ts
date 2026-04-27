import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test the successful refresh token flow for a super administrator.
 *
 * Validates the complete token refresh lifecycle: obtaining initial JWT tokens through super administrator account creation, using the refresh token to obtain new tokens, verifying token rotation security (old tokens become invalid), and confirming multiple refresh operations are supported for session extension.
 *
 * 1. Create a super administrator via `authorize_super_administrator_join` to obtain initial JWT access and refresh tokens.
 * 2. Call `authorize_super_administrator_refresh` with the initial refresh token to get new tokens.
 * 3. Verify the new access token and refresh token differ from the initial ones (token rotation).
 * 4. Attempt to reuse the initial (now consumed) refresh token — expect HTTP 401 Unauthorized.
 * 5. Call refresh again with the new refresh token to verify the session can be extended multiple times.
 */
export async function test_api_super_administrator_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator account to get initial JWT tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_administrator_join(
    joinConnection,
    {},
  );
  typia.assert(joinResult);
  const initialRefreshToken = joinResult.token.refresh;
  const initialAccessToken = joinResult.token.access;
  // Step 2: Call refresh with the initial refresh token
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_super_administrator_refresh(
    firstRefreshConnection,
    {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IECommerceMallSuperAdministrator.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Step 3: Verify token rotation - new tokens differ from initial tokens
  TestValidator.notEquals(
    "access token changes after refresh",
    firstRefreshResult.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token changes after refresh",
    firstRefreshResult.token.refresh,
    initialRefreshToken,
  );
  const newRefreshToken = firstRefreshResult.token.refresh;
  // Step 4: Verify old refresh token is rejected (401 Unauthorized) - rotation security
  await TestValidator.httpError(
    "old refresh token should be revoked",
    401,
    async () => {
      const oldTokenConnection: api.IConnection = { host: connection.host };
      await authorize_super_administrator_refresh(oldTokenConnection, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies IECommerceMallSuperAdministrator.IRefresh,
      });
    },
  );
  // Step 5: Verify the new refresh token can be used again (multiple session extensions)
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_super_administrator_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: newRefreshToken,
      } satisfies IECommerceMallSuperAdministrator.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  TestValidator.notEquals(
    "second refresh produces new access token",
    secondRefreshResult.token.access,
    firstRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "second refresh produces new refresh token",
    secondRefreshResult.token.refresh,
    newRefreshToken,
  );
}
