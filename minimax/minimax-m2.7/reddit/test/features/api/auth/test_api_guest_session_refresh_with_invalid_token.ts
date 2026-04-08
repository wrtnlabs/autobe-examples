import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid guest session to obtain valid refresh token
  const validGuestSession = await authorize_guest_join(connection, {});
  typia.assert(validGuestSession);
  // 2. Attempt to refresh with an INVALID (tampered) refresh token
  // The invalid token should be a completely fake or tampered string
  const invalidRefreshToken = `invalid_tampered_token_${RandomGenerator.alphaNumeric(32)}`;
  // 3. Validate that the system rejects the invalid token with 401 Unauthorized
  await TestValidator.error("should reject invalid refresh token", async () => {
    const guestConnection: api.IConnection = { host: connection.host };
    await api.functional.redditClone.auth.guest.refresh(guestConnection, {
      body: {
        refreshToken: invalidRefreshToken,
      } satisfies IRedditCloneGuest.IRefresh,
    });
  });
}
