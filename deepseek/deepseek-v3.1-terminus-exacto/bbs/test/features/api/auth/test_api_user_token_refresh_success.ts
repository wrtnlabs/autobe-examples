import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test successful token refresh workflow.
 * 1. Create a new user account via join endpoint to establish initial session
 * 2. Use the returned refresh token to call the refresh endpoint
 * 3. Validate that new access and refresh tokens are generated with updated expiration timestamps
 * 4. Verify that tokens are properly renewed while maintaining user identity
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and join to establish initial session
  const userConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Get the initial refresh token
  const initialRefreshToken = initialAuth.token.refresh;
  // 3. Use the refresh token to get new tokens via utility function
  const refreshedAuth = await authorize_user_refresh(userConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IDiscussionBoardUser.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate that new tokens are different from old ones
  TestValidator.notEquals(
    "access token should be renewed",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 5. Validate that tokens have valid expiration timestamps
  TestValidator.predicate(
    "new access token should have future expiration",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new refresh token should have future expiration",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // 6. Validate that user identity information remains consistent
  TestValidator.equals(
    "user id should remain the same",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "user email should remain the same",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "display name should remain the same",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
}
