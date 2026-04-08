import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member token refresh with invalid refresh token.
 *
 * Validates that the authentication system properly rejects invalid or malformed refresh tokens, preventing unauthorized session access. The test registers a valid member account, then attempts to refresh tokens using an intentionally corrupted refresh token.
 *
 * Special attention is given to ensuring that the system returns HTTP 401 Unauthorized when presented with invalid credentials, which is critical for security against token hijacking and replay attacks.
 *
 * 1. Register a new member account with valid credentials.
 * 2. Create an invalid refresh token by appending garbage to the valid token.
 * 3. Attempt to refresh tokens with the invalid refresh token.
 * 4. Verify the system returns HTTP 401 Unauthorized error.
 */
export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection);
  typia.assert(member);
  // 2. Create an invalid refresh token by modifying the valid one
  const invalidRefreshToken = member.token.refresh + "_invalid_garbage_suffix";
  // 3. Create a fresh connection for the invalid token test to avoid header contamination
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to refresh with invalid token and verify 401 error
  await TestValidator.httpError(
    "invalid refresh token returns 401",
    401,
    async () =>
      await authorize_member_refresh(invalidTokenConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IHrmTimeTrackMember.IRefresh,
      }),
  );
}
