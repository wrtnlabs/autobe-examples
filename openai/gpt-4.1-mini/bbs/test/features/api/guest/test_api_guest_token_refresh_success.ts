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

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest join connection to obtain initial guest tokens
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const authorizedJoin = await authorize_guest_join(guestJoinConnection, {
    body: {}, // IDiscussionBoardGuest.IJoin is empty object
  });
  typia.assert(authorizedJoin);
  // 2. Use the refresh token to refresh the token pair
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  // Apply refresh token to the header for authorization
  guestRefreshConnection.headers = {
    Authorization: `Bearer ${authorizedJoin.token.refresh}`,
  };
  // Call the utility function to refresh token
  const authorizedRefresh = await authorize_guest_refresh(
    guestRefreshConnection,
    {
      body: {},
    },
  );
  typia.assert(authorizedRefresh);
  // 3. Validate that a new token is issued and is different from the original
  TestValidator.notEquals(
    "access token should be new",
    authorizedRefresh.token.access,
    authorizedJoin.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be new",
    authorizedRefresh.token.refresh,
    authorizedJoin.token.refresh,
  );
  // 4. Validate that expiration properties are in proper ISO 8601 date-time format
  // typia.assert() already validates string & date-time format
  typia.assert<IAuthorizationToken>(authorizedRefresh.token);
  // 5. Validate that refresh token expiration is later than access token expiration
  const expiredAt = new Date(authorizedRefresh.token.expired_at);
  const refreshableUntil = new Date(authorizedRefresh.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until later than expired_at",
    refreshableUntil > expiredAt,
  );
}
