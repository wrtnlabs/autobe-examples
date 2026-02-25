import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin refresh token rotation and replay attack prevention.
 *
 * This test validates critical security features:
 * 1. Old refresh tokens are invalidated after use (single-use enforcement)
 * 2. Token rotation works correctly for maintaining secure sessions
 * 3. Replay attacks are prevented when attempting to reuse old tokens
 *
 * Flow:
 * 1. Create admin account and receive initial refresh token
 * 2. Use refresh token to obtain new tokens (rotation)
 * 3. Attempt to reuse old refresh token (should fail - replay prevention)
 * 4. Use new refresh token to verify rotation continues working
 */
export async function test_api_admin_auth_refresh_token_rotation_replay_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(initialAuth);
  // Capture initial refresh token for replay attack test
  const initialRefreshToken = initialAuth.refresh;
  // Step 2: First refresh - use initial token to get new tokens
  const refreshConnection1: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_admin_refresh(refreshConnection1, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(secondAuth);
  // Capture second refresh token for further rotation test
  const secondRefreshToken = secondAuth.refresh;
  // Verify token rotation: new tokens should be different from initial
  TestValidator.notEquals(
    "refresh token should rotate to new value",
    initialRefreshToken,
    secondRefreshToken,
  );
  TestValidator.notEquals(
    "access token should be new after refresh",
    initialAuth.access,
    secondAuth.access,
  );
  // Step 3: Attempt to reuse old (already-used) refresh token
  // This should FAIL - replay attack prevention
  await TestValidator.error(
    "reusing old refresh token should be rejected (replay attack prevention)",
    async () => {
      const replayConnection: api.IConnection = { host: connection.host };
      await authorize_admin_refresh(replayConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
  // Step 4: Verify new refresh token works correctly
  const refreshConnection2: api.IConnection = { host: connection.host };
  const thirdAuth = await authorize_admin_refresh(refreshConnection2, {
    body: {
      refresh_token: secondRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(thirdAuth);
  // Verify rotation continues with each refresh
  TestValidator.notEquals(
    "third refresh token should differ from second",
    secondRefreshToken,
    thirdAuth.refresh,
  );
  TestValidator.predicate(
    "third auth should have valid access token",
    thirdAuth.access.length > 0,
  );
}
