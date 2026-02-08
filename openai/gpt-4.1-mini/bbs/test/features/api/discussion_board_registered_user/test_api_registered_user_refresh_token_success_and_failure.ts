import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

/**
 * Test the token refresh operation for registered users.
 *
 * Scenario covers:
 * - Successful token refresh with a valid refresh token received from a registered user who has joined the platform.
 * - Token refresh attempt with invalid refresh token should reject access.
 *
 * Dependencies:
 * - Registered user join operation to create an account and obtain a valid initial refresh token.
 */
export async function test_api_registered_user_refresh_token_success_and_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new registered user to get initial tokens
  const userConnection: api.IConnection = { host: connection.host };
  const joinAuthorized: IDiscussionBoardRegisteredUser.IAuthorized =
    await authorize_registered_user_join(userConnection, {
      body: {}, // IJoin has no props, so pass empty body
    });
  typia.assert(joinAuthorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = joinAuthorized.token.access;
  // 2. Refresh token request with valid refresh token from join response
  const refreshResponseValid = await authorize_registered_user_refresh(
    userConnection,
    {
      body: {}, // IRefresh has no props as per schema, refresh token assumed from header
    },
  );
  typia.assert(refreshResponseValid);
  // Validate new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be rotated",
    joinAuthorized.token.access,
    refreshResponseValid.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    joinAuthorized.token.refresh,
    refreshResponseValid.token.refresh,
  );
  // Validate expiration timestamps are ISO 8601 strings
  TestValidator.predicate(
    "access token expiration ISO 8601",
    typeof refreshResponseValid.token.expired_at === "string" &&
      refreshResponseValid.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until expiration ISO 8601",
    typeof refreshResponseValid.token.refreshable_until === "string" &&
      refreshResponseValid.token.refreshable_until.length > 0,
  );
  // 3. Attempt token refresh with an invalid refresh token
  const invalidUserConnection: api.IConnection = { host: connection.host };
  invalidUserConnection.headers = {
    Authorization: "Bearer invalid_or_revoked_refresh_token",
  };
  await TestValidator.error(
    "refresh token with invalid token throws error",
    async () => {
      await authorize_registered_user_refresh(invalidUserConnection, {
        body: {},
      });
    },
  );
}
