import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest session to get a valid refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const joinedResponse: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(joinedResponse);
  // Step 2: Extract the refresh token from the response
  const refreshToken: string = joinedResponse.token.refresh;
  // Step 3: Create a new connection and refresh the guest session using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedResponse: ITodoAppGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refreshToken: refreshToken,
      } satisfies ITodoAppGuest.IRefresh,
    });
  typia.assert(refreshedResponse);
  // Step 4: Validate the new access token has correct expiration (15 minutes)
  const now = new Date();
  const newAccessTokenExpireTime = new Date(refreshedResponse.token.expired_at);
  TestValidator.predicate(
    "new access token expires within 15 minutes (900-960 seconds)",
    newAccessTokenExpireTime.getTime() - now.getTime() >= 900000 &&
      newAccessTokenExpireTime.getTime() - now.getTime() <= 960000,
  );
  // Step 5: Validate that session expiration (refreshable_until) was extended if within 20% of original window
  // Original window is 60 minutes (3600000ms), 20% is 720000ms (12 minutes)
  // If refresh occurs within 12 minutes of expiration, session should be extended by another 60 minutes
  const originalSessionExpireTime = new Date(
    joinedResponse.token.refreshable_until,
  );
  const newSessionExpireTime = new Date(
    refreshedResponse.token.refreshable_until,
  );
  const remainingTime = originalSessionExpireTime.getTime() - now.getTime(); // Time left in original session
  // If refresh was done within last 20% of session (<= 12 minutes before expiration),
  // the refreshable_until should be extended by 60 minutes (3600000ms)
  if (remainingTime <= 720000) {
    // within last 12 minutes of 60-minute window
    TestValidator.predicate(
      "session expiration extended by 60 minutes when refreshed within last 20% of window",
      newSessionExpireTime.getTime() - originalSessionExpireTime.getTime() >=
        3600000 &&
        newSessionExpireTime.getTime() - originalSessionExpireTime.getTime() <=
          3660000,
    );
  } else {
    // refreshed outside last 20% window
    TestValidator.equals(
      "session expiration unchanged when refreshed outside last 20% of window",
      newSessionExpireTime.getTime(),
      originalSessionExpireTime.getTime(),
    );
  }
  // Step 6: Verify that the refresh token from the original session is still valid (not rotated)
  TestValidator.equals(
    "refresh token remains unchanged after successful refresh",
    refreshedResponse.token.refresh,
    refreshToken,
  );
  // Step 7: Test invalid refresh token (should fail)
  await TestValidator.error("invalid refresh token should fail", async () => {
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refreshToken: "invalid-token",
      } satisfies ITodoAppGuest.IRefresh,
    });
  });
}
