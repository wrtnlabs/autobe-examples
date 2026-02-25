import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_failure_expired_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session and obtain a valid refresh token
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestJoinConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(16),
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ipAddress: "127.0.0.1",
      anonymousId: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestAuthorized);
  // 2. Prepare invalid expired refresh token (simulate a malformed or expired token string)
  const invalidRefreshTokens = [
    "", // empty string
    "abcdefg.invalid.token", // malformed token
    "expired.token.value", // assume this is expired
  ];
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  // 3. Test each invalid refresh token, expect refresh failure (rejection)
  for (const badToken of invalidRefreshTokens) {
    await TestValidator.httpError(
      `guest refresh failure with invalid token: '${badToken}'`,
      [400, 401, 403],
      async () => {
        await authorize_guest_refresh(guestRefreshConnection, {
          body: {
            refreshToken: badToken,
          } satisfies IDiscussionBoardGuest.IRefresh,
        });
      },
    );
  }
}
