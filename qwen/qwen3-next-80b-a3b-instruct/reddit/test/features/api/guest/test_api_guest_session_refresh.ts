import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create temporary guest identity to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse: ICommunityBbsGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {},
    });
  typia.assert(joinResponse);
  // Step 2: Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  typia.assert<string & tags.Format<"uuid">>(refreshToken);
  // Step 3: Use refresh token to refresh session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse: ICommunityBbsGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      },
    });
  typia.assert(refreshResponse);
  // Step 4: Validate same guest identity
  TestValidator.equals(
    "guest identity unchanged",
    joinResponse.id,
    refreshResponse.id,
  );
  // Step 5: Validate refresh token unchanged
  TestValidator.equals(
    "refresh token unchanged",
    joinResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  // Step 6: Validate access token renewed
  TestValidator.notEquals(
    "access token renewed",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  // Step 7: Validate refreshable_until unchanged (session persistence)
  TestValidator.equals(
    "refreshable_until unchanged",
    joinResponse.token.refreshable_until,
    refreshResponse.token.refreshable_until,
  );
  // Validate timestamps are in proper ISO 8601 format
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.refreshable_until,
  );
}
