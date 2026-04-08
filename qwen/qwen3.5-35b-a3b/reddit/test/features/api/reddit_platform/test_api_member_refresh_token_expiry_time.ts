import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that token refresh sets correct expiration time for new access token.
 *
 * Validates the complete refresh token workflow including member registration, token renewal,
 * and expiration time verification. Ensures that the refresh operation correctly sets the
 * new access token's expiration to exactly 1 hour from the refresh time, and that token
 * rotation occurs properly.
 *
 * Special attention is given to verifying that the time difference between the refresh
 * call and the new expires_at is precisely 3600 seconds, and that the new token replaces
 * the old one (token rotation).
 *
 * 1. Member joins via /auth/member/join with randomized credentials.
 * 2. Record the initial expires_at timestamp from the join response.
 * 3. Record current timestamp before calling refresh.
 * 4. Call /auth/member/refresh with the refresh_token from join.
 * 5. Extract the new expires_at from the refresh response.
 * 6. Verify the new expires_at is exactly 3600 seconds (1 hour) from current time.
 */
export async function test_api_member_refresh_token_expiry_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Record initial expires_at timestamp
  const initialExpiresAt = new Date(joinResponse.token.expired_at).getTime();
  // 3. Record current timestamp before refresh
  const refreshCallTime = Date.now();
  // 4. Call refresh with the refresh_token from join
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: joinResponse.token.refresh,
    } satisfies IRedditPlatformMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Extract new expires_at timestamp
  const newExpiresAt = new Date(refreshResponse.token.expired_at).getTime();
  // 6. Verify the new expires_at is approximately 3600 seconds (1 hour) from refresh call time
  const timeDifferenceSeconds = (newExpiresAt - refreshCallTime) / 1000;
  const expectedTimeDifference = 3600; // 1 hour in seconds
  const toleranceSeconds = 5; // Allow 5 seconds tolerance for network/delays
  TestValidator.equals(
    "expires_at time difference",
    timeDifferenceSeconds,
    expectedTimeDifference,
    (key) => key.includes("expires"),
  );
  TestValidator.predicate(
    "time difference within tolerance",
    Math.abs(timeDifferenceSeconds - expectedTimeDifference) <=
      toleranceSeconds,
  );
  // 7. Verify token rotation - new expires_at should be different from initial
  const expiresAtChanged = newExpiresAt !== initialExpiresAt;
  TestValidator.predicate(
    "expires_at changed (token rotation)",
    expiresAtChanged,
  );
  // 8. Verify the new expires_at is in the future
  const expiresAtIsFuture = newExpiresAt > refreshCallTime;
  TestValidator.predicate("new expires_at is in the future", expiresAtIsFuture);
}
