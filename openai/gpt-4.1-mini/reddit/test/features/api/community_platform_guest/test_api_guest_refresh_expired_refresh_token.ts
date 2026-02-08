import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_expired_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // Test refreshing JWT authorization tokens with an expired refresh token.
  // Confirm the system rejects the token refresh request with an error response.
  // 1. Guest join to obtain initial authorization tokens.
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Simulate expired refresh token by creating a new connection with an expired refresh token
  // We'll clone the authorized tokens but set expired refresh token by manipulating the token string
  // Since actual token strings can't be modified realistically, simulate error by using incorrect refresh token
  // Create a new connection and forcibly set Authorization header with expired refresh token
  const expiredToken = authorized.token.refresh + "_expired"; // Append suffix to invalidate token
  const expiredConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: expiredToken,
    },
  };
  // 3. Attempt to refresh with expired token and expect an error
  // The authorize_guest_refresh utility uses token from inside but we'll call it with expiredConnection, so
  // we bypass utility that sets Authorization to valid token and instead directly use expired token header.
  await TestValidator.error("refresh expired refresh token", async () => {
    // Call api functional directly because authorize_guest_refresh sets Authorization header to valid token automatically
    // We want to test expired token usage which we manually set
    await api.functional.communityPlatform.auth.guest.refresh(
      expiredConnection,
      {
        body: {},
      },
    );
  });
}
