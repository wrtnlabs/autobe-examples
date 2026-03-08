import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_token_refresh_expired_requires_reauthentication(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {});
  typia.assert(authResult);
  // Store the valid refresh token for later verification
  const validRefreshToken = authResult.token.refresh;
  // Step 2: Attempt to refresh with a fabricated expired/invalid refresh token
  // Since we cannot actually wait for token expiration, we use an invalid token format
  // to simulate the expired token scenario - the server treats both the same way
  const expiredRefreshToken = "expired." + RandomGenerator.alphaNumeric(50);
  // Step 3: Verify the system rejects the request with an authentication error
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await api.functional.todoApp.auth.guest.refresh(testConnection, {
        body: {
          refreshToken: expiredRefreshToken,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
  // Step 4: Also verify that completely malformed tokens are rejected
  await TestValidator.error(
    "malformed refresh token should be rejected",
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await api.functional.todoApp.auth.guest.refresh(testConnection, {
        body: {
          refreshToken: "not-a-valid-jwt-token-at-all",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
  // Step 5: Verify that the valid refresh token still works (re-authentication flow)
  // This demonstrates that the user can continue their session with valid credentials
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: validRefreshToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // Verify that refresh produces new tokens
  TestValidator.notEquals(
    "new access token should differ",
    refreshResult.token.access,
    authResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ",
    refreshResult.token.refresh,
    validRefreshToken,
  );
}