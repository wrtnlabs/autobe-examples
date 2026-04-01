import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator refresh token rotation security mechanism.
 *
 * This test verifies that the token rotation security mechanism properly
 * invalidates old refresh tokens after a successful refresh operation,
 * preventing token reuse and replay attacks.
 *
 * Test Flow:
 * 1. Register new administrator account to obtain initial authentication tokens
 * 2. Capture the initial refresh token from the join response
 * 3. Call refresh endpoint with initial refresh token to get new token pair
 * 4. Capture the new refresh token from the refresh response
 * 5. Attempt to refresh again using the OLD (initial) refresh token
 * 6. Verify the old token refresh attempt fails with unauthorized error
 * 7. Verify the new refresh token from step 4 can still be used successfully
 */
export async function test_api_administrator_refresh_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new administrator account to obtain initial tokens
  const adminJoinResult: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(10)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    });
  typia.assert(adminJoinResult);
  // Step 2: Capture the initial refresh token from join response
  const initialRefreshToken: string = adminJoinResult.token.refresh;
  // Step 3: Create new connection and call refresh with initial token
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefreshResult: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_refresh(refreshConnection1, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IShoppingMallAdministrator.IRefresh,
    });
  typia.assert(firstRefreshResult);
  // Step 4: Capture the new refresh token from first refresh response
  const newRefreshToken: string = firstRefreshResult.token.refresh;
  // Step 5 & 6: Attempt to refresh again using the OLD (initial) refresh token
  // This should fail with unauthorized error due to token rotation
  const oldTokenRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be invalidated after successful refresh",
    async () => {
      await authorize_administrator_refresh(oldTokenRefreshConnection, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies IShoppingMallAdministrator.IRefresh,
      });
    },
  );
  // Step 7: Verify the new refresh token from step 4 can still be used successfully
  const refreshConnection2: api.IConnection = { host: connection.host };
  const secondRefreshResult: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_refresh(refreshConnection2, {
      body: {
        refreshToken: newRefreshToken,
      } satisfies IShoppingMallAdministrator.IRefresh,
    });
  typia.assert(secondRefreshResult);
  // Validate that the administrator identity remains consistent
  TestValidator.equals(
    "administrator ID should remain consistent across token refreshes",
    adminJoinResult.id,
    secondRefreshResult.id,
  );
  TestValidator.equals(
    "administrator email should remain consistent across token refreshes",
    adminJoinResult.email,
    secondRefreshResult.email,
  );
}
