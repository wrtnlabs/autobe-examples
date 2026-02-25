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

export async function test_api_user_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account and get initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_user_join(joinConnection, {});
  typia.assert(joinedUser);
  // Step 2: Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 3: Perform token refresh operation
  const refreshedUser = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: joinedUser.token.refresh,
    } satisfies ICommunityPlatformUser.IRefresh,
  });
  typia.assert(refreshedUser);
  // Step 4: Validate new tokens have updated expiration timestamps
  TestValidator.predicate(
    "new access token expiration is later",
    new Date(refreshedUser.token.expired_at).getTime() >
      new Date(joinedUser.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "new refresh token expiration is later",
    new Date(refreshedUser.token.refreshable_until).getTime() >
      new Date(joinedUser.token.refreshable_until).getTime(),
  );
  // Step 5: Validate complete user profile information is included
  TestValidator.equals("user ID matches", refreshedUser.id, joinedUser.id);
  TestValidator.equals(
    "username matches",
    refreshedUser.username,
    joinedUser.username,
  );
  TestValidator.equals("email matches", refreshedUser.email, joinedUser.email);
  TestValidator.equals(
    "karma score matches",
    refreshedUser.karma,
    joinedUser.karma,
  );
  TestValidator.equals(
    "display name matches",
    refreshedUser.display_name,
    joinedUser.display_name,
  );
  TestValidator.equals("bio matches", refreshedUser.bio, joinedUser.bio);
  TestValidator.equals(
    "avatar URL matches",
    refreshedUser.avatar_url,
    joinedUser.avatar_url,
  );
  TestValidator.equals(
    "email verified status matches",
    refreshedUser.email_verified,
    joinedUser.email_verified,
  );
  TestValidator.equals(
    "created at matches",
    refreshedUser.created_at,
    joinedUser.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    refreshedUser.updated_at,
    joinedUser.updated_at,
  );
  TestValidator.equals(
    "deleted at matches",
    refreshedUser.deleted_at,
    joinedUser.deleted_at,
  );
  // Step 6: Test refresh token rotation - old refresh token should not work
  await TestValidator.error("old refresh token should be invalid", async () => {
    const failedConnection: api.IConnection = { host: connection.host };
    await authorize_user_refresh(failedConnection, {
      body: {
        refresh_token: joinedUser.token.refresh,
      } satisfies ICommunityPlatformUser.IRefresh,
    });
  });
  // Step 7: Verify new tokens are different from old ones
  TestValidator.notEquals(
    "access token changed",
    refreshedUser.token.access,
    joinedUser.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshedUser.token.refresh,
    joinedUser.token.refresh,
  );
}
