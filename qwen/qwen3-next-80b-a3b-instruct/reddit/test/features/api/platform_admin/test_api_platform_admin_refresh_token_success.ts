import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Create new platform admin account to obtain valid refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  typia.assert(joined);
  // Use the refresh token from the join response to refresh the session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_refresh(refreshConnection, {
      body: {
        refreshToken: joined.token.refresh,
      } satisfies IRedditCommunityPlatformAdmin.IRefresh,
    });
  typia.assert(refreshed);
  // Validate that the refresh operation returned a new access token
  TestValidator.notEquals(
    "access token refreshed",
    joined.token.access,
    refreshed.token.access,
  );
  // Validate that the refresh token was rotated
  TestValidator.notEquals(
    "refresh token rotated",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  // Validate that the user profile data remains unchanged
  TestValidator.equals("user profile unchanged", joined.id, refreshed.id);
  TestValidator.equals(
    "username unchanged",
    joined.username,
    refreshed.username,
  );
  TestValidator.equals("email unchanged", joined.email, refreshed.email);
  TestValidator.equals(
    "karma_score unchanged",
    joined.karma_score,
    refreshed.karma_score,
  );
  TestValidator.equals(
    "created_at unchanged",
    joined.created_at,
    refreshed.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged",
    joined.updated_at,
    refreshed.updated_at,
  );
  TestValidator.equals(
    "is_deleted unchanged",
    joined.is_deleted,
    refreshed.is_deleted,
  );
  // Validate that the access token expiration is set to 7 days
  const accessTokenExpiry = new Date(refreshed.token.expired_at);
  const now = new Date();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "access token expires in approximately 7 days",
    () => {
      const diff = accessTokenExpiry.getTime() - now.getTime();
      return diff > sevenDaysInMs - 60000 && diff < sevenDaysInMs + 60000; // Allow 1 minute tolerance
    },
  );
  // Validate that the refresh token expiration is set to 30 days ahead
  const refreshTokenExpiry = new Date(refreshed.token.refreshable_until);
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token expires in approximately 30 days",
    () => {
      const diff = refreshTokenExpiry.getTime() - now.getTime();
      return diff > thirtyDaysInMs - 60000 && diff < thirtyDaysInMs + 60000; // Allow 1 minute tolerance
    },
  );
}
