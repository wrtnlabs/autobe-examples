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

export async function test_api_guest_session_refresh_near_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Create initial guest session (token with 5 mins validity)
  const initialResponse: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: typia.random<ICommunityPlatformGuest.IJoin>(),
    });
  typia.assert(initialResponse);
  // 2. Wait for token to be near expiration (4.5 minutes, leaving 30 seconds)
  await new Promise((resolve) => setTimeout(resolve, 4.5 * 60 * 1000));
  // 3. Refresh guest token (with nearly expired token)
  const refreshResponse: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: typia.random<ICommunityPlatformGuest.IRefresh>(),
    });
  typia.assert(refreshResponse);
  // 4. Validate new token has 30 minutes validity
  const newExpiredAt = refreshResponse.token.expired_at;
  const expectedExpiration = new Date();
  expectedExpiration.setMinutes(expectedExpiration.getMinutes() + 30);
  const timeDifference = Math.abs(
    new Date(newExpiredAt).getTime() - expectedExpiration.getTime(),
  );
  // Check that the new token's expiration is within 1 minute of expected
  TestValidator.predicate(
    "new token has correct expiration time",
    timeDifference <= 60 * 1000,
  );
}
