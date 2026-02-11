import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as community moderator (creates account but no active session)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPasswordPlain = RandomGenerator.alphaNumeric(16); // Raw password
  await authorize_community_moderator_join(joinConnection, {
    body: {
      email: joinEmail,
      password_hash: RandomGenerator.alphaNumeric(16), // Hashed password for registration
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  // 2. Login to obtain initial access and refresh tokens (activates session)
  // For login, use plain password (not hash) based on common authentication pattern
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_community_moderator_login(
    loginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPasswordPlain, // Use plain password for login, not password_hash
      },
    },
  );
  typia.assert(loginResponse);
  // 3. Use the refresh token to perform refresh operation (token rotation)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_community_moderator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: loginResponse.refresh_token,
      } satisfies IRedditCommunityCommunityModerator.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 4. Validate refresh response structure and token rotation
  TestValidator.equals(
    "access_token differs",
    loginResponse.access_token,
    refreshResponse.access_token,
  );
  TestValidator.notEquals(
    "refresh_token is rotated",
    loginResponse.refresh_token,
    refreshResponse.refresh_token,
  );
  TestValidator.equals("expires_in is 900", refreshResponse.expires_in, 900);
  // Validate token structure matches IAuthorizationToken
  TestValidator.equals(
    "token.access matches access_token",
    refreshResponse.token.access,
    refreshResponse.access_token,
  );
  TestValidator.equals(
    "token.refresh matches refresh_token",
    refreshResponse.token.refresh,
    refreshResponse.refresh_token,
  );
  // Verify expiration times are in future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "token.expired_at in future",
    (() => {
      return new Date(refreshResponse.token.expired_at) > new Date(now);
    })(),
  );
  TestValidator.predicate(
    "token.refreshable_until in future",
    (() => {
      return new Date(refreshResponse.token.refreshable_until) > new Date(now);
    })(),
  );
}
