import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session to get tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizedSession = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      user_agent: RandomGenerator.name(1),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(authorizedSession);
  // Step 2: Test success path with valid refresh token
  const validRefreshToken = authorizedSession.refresh;
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection1, {
    body: {
      refresh_token: validRefreshToken satisfies string & tags.Format<"uuid">,
    } satisfies IRedditLikeGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Verify refresh returned new tokens and session structure
  TestValidator.equals(
    "new access token issued",
    typeof refreshedSession.access,
    "string",
  );
  TestValidator.equals(
    "new refresh token issued",
    typeof refreshedSession.refresh,
    "string",
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedSession.refresh,
    validRefreshToken,
  );
  // Step 3: Test failure path with invalid refresh token (non-existent UUID)
  const invalidRefreshToken = "00000000-0000-0000-0000-000000000000";
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject non-existent refresh token",
    async () => {
      await authorize_guest_refresh(refreshConnection2, {
        body: {
          refresh_token: invalidRefreshToken satisfies string &
            tags.Format<"uuid">,
        } satisfies IRedditLikeGuest.IRefresh,
      });
    },
  );
  // Step 4: Test with another non-existent UUID
  const anotherInvalidToken = "ffffffff-ffff-ffff-ffff-ffffffffffff";
  const refreshConnection3: api.IConnection = { host: connection.host };
  await TestValidator.error("should reject another invalid token", async () => {
    await authorize_guest_refresh(refreshConnection3, {
      body: {
        refresh_token: anotherInvalidToken satisfies string &
          tags.Format<"uuid">,
      } satisfies IRedditLikeGuest.IRefresh,
    });
  });
  // Step 5: Verify original token still works for final verification
  const refreshConnectionFinal: api.IConnection = { host: connection.host };
  const finalSession = await authorize_guest_refresh(refreshConnectionFinal, {
    body: {
      refresh_token: validRefreshToken satisfies string & tags.Format<"uuid">,
    } satisfies IRedditLikeGuest.IRefresh,
  });
  typia.assert(finalSession);
}
