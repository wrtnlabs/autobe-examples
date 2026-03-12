import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that token refresh fails when using an already-rotated refresh token.
 *
 * This test validates the token rotation security mechanism:
 * 1. Register a new member and obtain initial tokens
 * 2. Store the initial refresh token
 * 3. Perform a successful refresh (which rotates the token)
 * 4. Attempt to use the old refresh token again
 * 5. Verify it fails with 401 Unauthorized error
 */
export async function test_api_member_token_refresh_with_rotated_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(initialAuth);
  // Step 2: Store the initial refresh token before rotation
  const initialRefreshToken = initialAuth.token.refresh;
  // Step 3: Perform a successful token refresh (this rotates the token)
  const refreshedAuth = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Verify we got new tokens
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 4 & 5: Attempt to use the old (rotated) refresh token again
  // This should fail with 401 Unauthorized
  await TestValidator.httpError(
    "rotated token rejected with 401",
    401,
    async () => {
      const staleConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(staleConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IMultiUserTodoMember.IRefresh,
      });
    },
  );
}
