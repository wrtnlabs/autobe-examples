import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session with valid token
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.redditPlatform.auth.guest.join(
    guestConnection,
    {
      body: {
        device_fingerprint: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformGuest.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Test with malformed refresh token (wrong format)
  await TestValidator.error("malformed refresh token", async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: {
        refreshToken: "not-a-valid-jwt-token-format",
      } satisfies IRedditPlatformGuest.IRefresh,
    });
  });
  // 3. Test with tampered refresh token
  await TestValidator.error("tampered refresh token", async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    const tamperedToken =
      joinResult.token.refresh.substring(0, 10) +
      "tampered" +
      joinResult.token.refresh.substring(20);
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: {
        refreshToken: tamperedToken,
      } satisfies IRedditPlatformGuest.IRefresh,
    });
  });
  // 4. Test with non-existent refresh token
  await TestValidator.error("non-existent refresh token", async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: {
        refreshToken:
          typia.random<string & tags.Format<"uuid">>() +
          "." +
          typia.random<string & tags.Format<"uuid">>() +
          "." +
          typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformGuest.IRefresh,
    });
  });
  // 5. Test with empty refresh token
  await TestValidator.error("empty refresh token", async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: {
        refreshToken: "",
      } satisfies IRedditPlatformGuest.IRefresh,
    });
  });
  // 6. Verify original session still valid after failed refresh attempts
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.redditPlatform.auth.guest.refresh(
    refreshConnection,
    {
      body: {
        refreshToken: joinResult.token.refresh,
      } satisfies IRedditPlatformGuest.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // Verify refresh created new tokens
  TestValidator.notEquals(
    "new access token",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
}
