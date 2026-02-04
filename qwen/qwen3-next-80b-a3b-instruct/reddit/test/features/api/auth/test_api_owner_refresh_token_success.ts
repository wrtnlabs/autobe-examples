import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for owner registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Step 1: Join as owner to obtain initial refresh token
  const joined: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      },
    });
  typia.assert(joined);
  // Extract refresh token from initial authorization
  const refreshToken: string = joined.token.refresh;
  // Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 2: Use refresh token to obtain new access token
  const refreshed: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_refresh(refreshConnection, {
      body: {
        refreshToken: refreshToken,
      },
    });
  typia.assert(refreshed);
  // Step 3: Validate that owner identity is maintained
  TestValidator.equals("owner ID unchanged", joined.id, refreshed.id);
  // Step 4: Validate that new access token was issued and has JWT format
  TestValidator.notEquals(
    "new access token issued",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.predicate(
    "new access token is JWT",
    refreshed.token.access.includes("."),
  );
  // Step 5: Validate that refresh token expiration remains unchanged
  TestValidator.equals(
    "refresh token expiration unchanged",
    joined.token.refreshable_until,
    refreshed.token.refreshable_until,
  );
  // Step 6: Validate that new access token has 7-day expiration
  // Get current time
  const now = new Date();
  const newTokenExpiresAt = new Date(refreshed.token.expired_at);
  const sevenDaysInMs = 604800000; // 7 days in milliseconds
  // Verify new access token expires in approximately 7 days from now (allowing 1 hour error)
  const minExpected = now.getTime() + sevenDaysInMs - 3600000; // 7 days minus 1 hour
  const maxExpected = now.getTime() + sevenDaysInMs + 3600000; // 7 days plus 1 hour
  TestValidator.predicate(
    "new access token has 7-day expiration",
    newTokenExpiresAt.getTime() >= minExpected &&
      newTokenExpiresAt.getTime() <= maxExpected,
  );
  // Step 7: Validate that refresh token field matches (identical string)
  TestValidator.equals(
    "refresh token unchanged",
    refreshToken,
    refreshed.token.refresh,
  );
  // Step 8: Verify all required fields in IAuthorized response
  TestValidator.predicate(
    "access token is string",
    typeof refreshed.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof refreshed.token.refresh === "string",
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    typeof refreshed.token.expired_at === "string" &&
      !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    typeof refreshed.token.refreshable_until === "string" &&
      !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );
}
