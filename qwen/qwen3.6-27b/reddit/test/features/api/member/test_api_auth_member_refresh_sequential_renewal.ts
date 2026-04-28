import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Tests sequential token refresh for member authentication.
 *
 * Validates that the member token refresh mechanism supports continuous session
 * renewal by calling the refresh endpoint multiple times in succession using the
 * refresh token obtained from each previous refresh call.
 *
 * 1. Register a new member account using authorize_member_join to obtain initial
 *    authentication tokens (including refresh token).
 * 2. Call the member refresh endpoint using the initial refresh token to obtain
 *    first refreshed token pair.
 * 3. Call the member refresh endpoint again using the new refresh token from step 2
 *    to obtain second refreshed token pair.
 * 4. Validate that each refresh operation returns a valid IAuthorized response with
 *    different refresh tokens and updated expiration timestamps, confirming the
 *    refresh mechanism works correctly for sequential renewals.
 */
export async function test_api_auth_member_refresh_sequential_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialResponse = await authorize_member_join(joinConnection, {
    body: {},
  });
  typia.assert(initialResponse);
  // 2. First refresh - obtain new token pair using initial refresh token
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResponse = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh: initialResponse.token.refresh,
      } satisfies IREdditLikeCommunityMember.IRefresh,
    },
  );
  typia.assert(firstRefreshResponse);
  // 3. Second refresh - use the new refresh token from the first refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh: firstRefreshResponse.token.refresh,
      } satisfies IREdditLikeCommunityMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResponse);
  // 4. Validate that tokens changed between refreshes
  TestValidator.notEquals(
    "refresh token changed after first refresh",
    initialResponse.token.refresh,
    firstRefreshResponse.token.refresh,
  );
  TestValidator.notEquals(
    "refresh token changed after second refresh",
    firstRefreshResponse.token.refresh,
    secondRefreshResponse.token.refresh,
  );
  TestValidator.notEquals(
    "access token changed after first refresh",
    initialResponse.token.access,
    firstRefreshResponse.token.access,
  );
  // 5. Validate expiration timestamps are updated
  TestValidator.notEquals(
    "expiration timestamp updated after first refresh",
    initialResponse.token.expired_at,
    firstRefreshResponse.token.expired_at,
  );
  TestValidator.notEquals(
    "expiration timestamp updated after second refresh",
    firstRefreshResponse.token.expired_at,
    secondRefreshResponse.token.expired_at,
  );
  // 6. Validate that each refresh extends the session (later expiration)
  TestValidator.predicate(
    "second refresh has later expiration than first",
    () =>
      new Date(secondRefreshResponse.token.expired_at).getTime() >
      new Date(firstRefreshResponse.token.expired_at).getTime(),
  );
}
