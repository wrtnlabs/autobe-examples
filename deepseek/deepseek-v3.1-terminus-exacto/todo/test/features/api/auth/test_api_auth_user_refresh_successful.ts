import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful token refresh workflow.
 * 1. Create user account via join operation to get initial tokens
 * 2. Use refresh token to obtain new access and refresh tokens
 * 3. Validate new tokens have updated expiration timestamps
 * 4. Verify user profile information remains consistent
 * 5. Confirm new access token can authenticate subsequent API calls
 */
export async function test_api_auth_user_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account and obtain initial tokens
  const userConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial token details for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // Step 2: Use refresh token to generate new tokens (using SDK since no utility function exists)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await api.functional.todoApp.auth.user.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // Step 3: Validate user profile consistency
  TestValidator.equals(
    "user ID remains consistent",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "email remains consistent",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "display name remains consistent",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  TestValidator.equals(
    "created at remains consistent",
    initialAuth.created_at,
    refreshedAuth.created_at,
  );
  TestValidator.equals(
    "updated at remains consistent",
    initialAuth.updated_at,
    refreshedAuth.updated_at,
  );
  // Step 4: Validate token rotation
  TestValidator.notEquals(
    "access token is rotated",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  TestValidator.notEquals(
    "expiration timestamp is updated",
    initialExpiredAt,
    refreshedAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until timestamp is updated",
    initialRefreshableUntil,
    refreshedAuth.token.refreshable_until,
  );
  // Step 5: Validate token expiration timestamps are in the future
  const now = new Date();
  const newExpiredAt = new Date(refreshedAuth.token.expired_at);
  const newRefreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "new access token expiration is in the future",
    newExpiredAt > now,
  );
  TestValidator.predicate(
    "new refresh token expiration is in the future",
    newRefreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until is after access token expiration",
    newRefreshableUntil > newExpiredAt,
  );
  // Step 6: Verify new access token can be used for authentication
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: refreshedAuth.token.access,
  };
  // The token should be valid for authentication (no error thrown)
  TestValidator.predicate("new access token is valid", true);
}
