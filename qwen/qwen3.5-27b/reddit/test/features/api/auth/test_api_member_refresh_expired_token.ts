import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that refreshing with an expired or invalid refresh token returns a 401 Unauthorized error.
 *
 * Validates the token refresh endpoint properly rejects invalid or expired refresh tokens. Since actual token expiration cannot be simulated in a test environment, this test uses an invalid token to verify the same error handling behavior that would occur with an expired token.
 *
 * The test ensures that the refresh endpoint does not issue new tokens when provided with an invalid refresh token, maintaining security by preventing unauthorized session continuation.
 *
 * 1. Register a new member account to obtain valid credentials and tokens.
 * 2. Create a separate connection for the refresh attempt to avoid token contamination.
 * 3. Call the refresh endpoint with an invalid (simulating expired) refresh token.
 * 4. Verify the response throws an HttpError with 401 Unauthorized status.
 */
export async function test_api_member_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a separate connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh with an INVALID token (simulating expired token)
  // We use an invalid token since we cannot wait for actual token expiration
  await TestValidator.httpError(
    "expired refresh token returns 401 Unauthorized",
    401,
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh_token: "invalid_expired_token_12345",
        } satisfies IRedditCloneMember.IRefresh,
      });
    },
  );
}
