import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh with expired or invalid refresh token.
 *
 * Verifies that when a member attempts to refresh their authentication using
 * an expired or invalid refresh token, the system returns a 401 Unauthorized
 * error and requires the member to log in again with credentials. No new
 * tokens should be generated for invalid refresh attempts.
 */
export async function test_api_member_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create member and obtain valid initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Attempt to refresh with an invalid/expired refresh token
  await TestValidator.httpError(
    "should return 401 for expired or invalid refresh token",
    401,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(refreshConnection, {
        body: {
          refreshToken:
            "expired_invalid_refresh_token_" + RandomGenerator.alphaNumeric(32),
        } satisfies IErpHrmMember.IRefresh,
      });
    },
  );
}
