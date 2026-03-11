import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh operation with a valid refresh token.
 *
 * Test Flow:
 * 1. Member registers via /economicPoliticalBoard/auth/member/join with valid credentials
 * 2. System returns initial access token and refresh token with expiration timestamps
 * 3. Member immediately calls refresh endpoint with the valid refresh token
 * 4. Validate that new access token is returned with fresh expiration time
 * 5. Validate that a new refresh token is returned (token rotation)
 * 6. Verify both tokens contain valid member role authorization
 *
 * Expected Results:
 * - HTTP 200 response
 * - New access token issued with updated expired_at timestamp
 * - New refresh token issued (token rotation)
 * - Response includes member ID matching original registration
 * - Member authentication state preserved without re-login
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract initial refresh token for refresh operation
  const initialRefreshToken = joinResponse.token.refresh;
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies IEconomicPoliticalBoardMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate member ID matches between join and refresh responses
  TestValidator.equals(
    "member ID matches between join and refresh",
    joinResponse.id,
    refreshResponse.id,
  );
  // 5. Validate refresh token rotation (new token should be different from original)
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshResponse.token.refresh,
  );
  // 6. Validate access token is different (fresh token issued)
  TestValidator.notEquals(
    "access token refreshed",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  // 7. Validate new refreshable_until timestamp is in the future
  const now = new Date();
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  // 8. Validate new expired_at timestamp is in the future
  const expiredAt = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  // 9. Validate expired_at is before refreshable_until
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    expiredAt < refreshableUntil,
  );
}
