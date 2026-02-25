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
 * Test that expired (or invalid) refresh tokens are properly rejected with authentication error.
 * Since we cannot wait for actual token expiration, we simulate by using an invalid token string.
 * The server should return authentication error for both expired and invalid tokens.
 */
export async function test_api_user_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account to establish baseline authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Test that an invalid/expired refresh token is rejected with authentication error
  // Using an invalid token simulates expiration scenario where token is no longer valid
  await TestValidator.httpError(
    "expired/invalid refresh token should be rejected",
    [401, 403],
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.auth.user.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: "invalid_expired_refresh_token_12345",
          } satisfies ICommunityPlatformUser.IRefresh,
        },
      );
    },
  );
  // 3. Additional validation: The original valid token should still work if not expired
  // This confirms our invalid token test is meaningful
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await api.functional.communityPlatform.auth.user.refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: authorized.token.refresh,
      } satisfies ICommunityPlatformUser.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.notEquals(
    "new tokens should be different after refresh",
    authorized.token.access,
    refreshed.token.access,
  );
}
