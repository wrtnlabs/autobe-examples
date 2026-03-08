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

export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Create guest account and session
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // Step 2: Attempt to refresh with an invalid/expired token
  // Using a fake refresh token to simulate expired token scenario
  const invalidRefreshToken =
    "expired_or_invalid_refresh_token_" + RandomGenerator.alphaNumeric(32);
  await TestValidator.httpError(
    "expired refresh token should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.guest.refresh(connection, {
        body: {
          refresh: invalidRefreshToken,
        } satisfies ICommunityPlatformGuest.IRefresh,
      });
    },
  );
  // Step 3: Verify that a valid refresh still works (control test)
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh: authorized.token.refresh,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshed);
  // Verify the refreshed token contains valid data
  TestValidator.predicate("refreshed has valid id", refreshed.id.length > 0);
  TestValidator.predicate(
    "refreshed has access token",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed has new refresh token",
    refreshed.token.refresh.length > 0,
  );
}
