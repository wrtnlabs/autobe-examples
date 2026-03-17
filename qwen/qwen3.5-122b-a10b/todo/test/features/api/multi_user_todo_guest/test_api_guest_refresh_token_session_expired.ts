import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account to obtain initial refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized);
  // Store the valid refresh token for reference
  const validRefreshToken = authorized.token.refresh;
  // 2. Attempt to refresh with an invalid/expired refresh token
  // Simulate session expiration by using a malformed token
  const invalidRefreshToken =
    "invalid_refresh_token_" + RandomGenerator.alphaNumeric(16);
  // Create a fresh connection for the invalid token test (no auth header)
  const invalidConnection: api.IConnection = { host: connection.host };
  // 3. Verify the system rejects the refresh request with 401
  await TestValidator.httpError(
    "expired session should be rejected",
    401,
    async () => {
      await authorize_guest_refresh(invalidConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
  // 4. Also verify that using the valid token works (positive test)
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshed);
  // Verify new tokens were generated
  TestValidator.notEquals(
    "new access token generated",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token generated",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
}
