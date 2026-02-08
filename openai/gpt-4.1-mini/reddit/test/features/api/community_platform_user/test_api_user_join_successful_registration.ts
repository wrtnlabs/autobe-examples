import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test registering a new user with valid and unique email, username, and password.
 * Validate the response includes authorization tokens and user profile info.
 * Verify the user can subsequently authenticate using the returned tokens.
 */
export async function test_api_user_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. User registration
  const joinResponse = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty type
  });
  typia.assert(joinResponse);
  // Set authorization header with access token
  userConnection.headers = {
    Authorization: `Bearer ${joinResponse.token.access}`,
  };
  // Validate token structure as per IAuthorizationToken
  const token = joinResponse.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid ISO date-time string",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is a valid ISO date-time string",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  // 2. Subsequent authentication using the returned tokens
  // (e.g. try refreshing the token)
  // Using authorize_user_refresh utility function if exists
  // Here we test refresh token functionality.
  // Create a new connection for refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  // Perform refresh using the refresh token from joinResponse
  const refreshResponse =
    await api.functional.communityPlatform.auth.user.refresh(
      refreshConnection,
      {
        body: { refresh: token.refresh } satisfies {
          refresh: string;
        },
      },
    );
  typia.assert(refreshResponse);
  // The refreshed token should have the same shape but different tokens
  TestValidator.notEquals(
    "access token changed on refresh",
    refreshResponse.token.access,
    token.access,
  );
  TestValidator.notEquals(
    "refresh token changed on refresh",
    refreshResponse.token.refresh,
    token.refresh,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time string after refresh",
    !isNaN(Date.parse(refreshResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time string after refresh",
    !isNaN(Date.parse(refreshResponse.token.refreshable_until)),
  );
}
