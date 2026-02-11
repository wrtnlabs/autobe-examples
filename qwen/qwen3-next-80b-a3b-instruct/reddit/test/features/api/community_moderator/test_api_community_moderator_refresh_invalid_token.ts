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

export async function test_api_community_moderator_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid community moderator account to obtain a legitimate refresh token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorDisplayName = RandomGenerator.name();
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        display_name: moderatorDisplayName,
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Log in to obtain a valid refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_community_moderator_login(
    loginConnection,
    {
      body: {
        email: moderatorEmail,
        password: "12345678", // Valid password for the account
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 3. Extract the legitimate refresh token
  const validRefreshToken = loginResponse.token.refresh;
  typia.assert(validRefreshToken);
  // 4. Create a deliberately invalid refresh token by truncating the last character
  const invalidRefreshToken = validRefreshToken.slice(0, -1);
  // 5. Attempt to refresh using the invalid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh should reject with 401 for invalid token",
    401,
    async () => {
      await authorize_community_moderator_refresh(refreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IRedditCommunityCommunityModerator.IRefresh,
      });
    },
  );
  // 6. Verify that the original account remains valid
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyResponse = await authorize_community_moderator_login(
    verifyConnection,
    {
      body: {
        email: moderatorEmail,
        password: "12345678",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(verifyResponse);
  TestValidator.equals(
    "original session still works",
    verifyResponse.token.refresh,
    loginResponse.token.refresh,
  );
}
