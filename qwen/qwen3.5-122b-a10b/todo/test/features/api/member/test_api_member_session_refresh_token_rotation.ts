import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session refresh token rotation security mechanism.
 *
 * Validates that the token rotation security feature properly invalidates old refresh tokens after successful refresh operations. This prevents token reuse attacks and limits the exposure window if a refresh token is compromised.
 *
 * The test verifies the complete token rotation workflow by: 1) Creating a new member account and obtaining initial authentication tokens, 2) Successfully refreshing the session to receive new access and refresh tokens, 3) Attempting to use the previously issued (now invalidated) refresh token, 4) Confirming that the old token is rejected with appropriate error response.
 *
 * 1. Member joins with valid credentials to receive initial tokens.
 * 2. Member refreshes session using the initial refresh token.
 * 3. System returns new access and refresh tokens while invalidating the old one.
 * 4. Test attempts to refresh again using the old refresh token.
 * 5. Verification that the old token is rejected (401 Unauthorized).
 */
export async function test_api_member_session_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to get initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // Store the initial refresh token before rotation
  const oldRefreshToken = joinResult.token.refresh;
  // 2. Refresh to get new tokens (token rotation occurs here)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResult);
  // Verify new tokens are different from old ones
  TestValidator.notEquals(
    "new access token differs from old",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshResult.token.refresh,
    oldRefreshToken,
  );
  // 3. Attempt to refresh again with the old refresh token (should fail)
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old refresh token should be rejected",
    401,
    async () => {
      await authorize_member_refresh(oldTokenConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
}
