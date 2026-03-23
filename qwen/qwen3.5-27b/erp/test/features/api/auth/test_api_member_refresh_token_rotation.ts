import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh token rotation prevents reuse attacks.
 *
 * This test validates that after a successful token refresh, the original
 * refresh token is invalidated and cannot be reused. This security mechanism
 * prevents token replay attacks where an attacker might intercept and reuse
 * a refresh token.
 *
 * Test Flow:
 * 1. Register new member and obtain initial refresh token
 * 2. Refresh tokens once (original token should be invalidated)
 * 3. Attempt to refresh again with original token (should fail)
 */
export async function test_api_member_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(joined);
  // Store the original refresh token before any rotation
  const originalRefreshToken = joined.token.refresh;
  // 2. First refresh - should succeed and rotate the token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_member_refresh(refreshedConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IHrmPlatformMember.IRefresh,
  });
  typia.assert(firstRefresh);
  // Verify new refresh token is different (rotation occurred)
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    firstRefresh.token.refresh,
  );
  // 3. Second refresh with original token - should fail
  // Create a fresh connection for this attempt
  const reuseAttemptConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "original refresh token cannot be reused after rotation",
    async () => {
      await authorize_member_refresh(reuseAttemptConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IHrmPlatformMember.IRefresh,
      });
    },
  );
}
