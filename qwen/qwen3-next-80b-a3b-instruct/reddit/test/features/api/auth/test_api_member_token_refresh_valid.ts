import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_token_refresh_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize member join to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Create a new connection with the same host but use the initialAuth's refresh token for refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  // The authorize_member_refresh function uses the refresh token from the connection's headers
  // Since we're using the same server, we can copy the initial auth connection to ensure the refresh token is in headers
  const refreshedAuth = await authorize_member_refresh(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate the new ICommunityPlatformMember.IAuthorized response contains updated tokens
  // Ensure original refresh token is invalidated (by checking it's different from initial)
  TestValidator.notEquals(
    "refresh token is rotated",
    initialAuth.refresh_token,
    refreshedAuth.refresh_token,
  );
  // Validate the structure of the refreshed response
  TestValidator.equals(
    "access token exists",
    refreshedAuth.access_token.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    refreshedAuth.refresh_token.length > 0,
    true,
  );
  TestValidator.equals(
    "member_id exists",
    refreshedAuth.member_id.length > 0,
    true,
  );
  TestValidator.equals(
    "username exists",
    refreshedAuth.username.length > 0,
    true,
  );
  TestValidator.equals(
    "display_name exists",
    refreshedAuth.display_name.length > 0,
    true,
  );
  TestValidator.equals("karma is non-negative", refreshedAuth.karma >= 0, true);
  // Step 4: Validate token expiration dates (7-day expiration for both tokens)
  const refreshExpiresAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  // Verify tokens have 7-day expiration (604800000 milliseconds)
  const now = new Date();
  const sevenDaysInMs = 604800000;
  TestValidator.predicate(
    "access token expires in approximately 7 days",
    Math.abs(refreshExpiresAt.getTime() - now.getTime() - sevenDaysInMs) <
      60000,
  );
  TestValidator.predicate(
    "refresh token is valid for 7 days",
    Math.abs(refreshableUntil.getTime() - now.getTime() - sevenDaysInMs) <
      60000,
  );
}
