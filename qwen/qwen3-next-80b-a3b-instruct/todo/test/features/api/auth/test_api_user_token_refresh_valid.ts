import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_token_refresh_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account with join operation to obtain refresh token
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(joinedUser);
  // Step 2: Extract the refresh token from the joined user's token
  const originalRefreshToken = joinedUser.token.refresh;
  typia.assert(originalRefreshToken);
  // Step 3: Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Perform the token refresh operation with the original refresh token
  const refreshedUser: ITodoAppUser.IAuthorized = await authorize_user_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: originalRefreshToken,
      },
    },
  );
  typia.assert(refreshedUser);
  // Step 5: Validate that the new access token has 15-minute expiration
  const now = new Date();
  const newAccessExpiredAt = new Date(refreshedUser.token.expired_at);
  const accessExpirationMinutes =
    (newAccessExpiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "new access token expires in approximately 15 minutes",
    Math.abs(accessExpirationMinutes - 15) < 2,
  );
  // Step 6: Validate that the new refresh token has 7-day expiration
  const newRefreshableUntil = new Date(refreshedUser.token.refreshable_until);
  const refreshExpirationDays =
    (newRefreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "new refresh token expires in approximately 7 days",
    Math.abs(refreshExpirationDays - 7) < 0.1,
  );
  // Step 7: Validate that the original refresh token is invalidated
  // Attempt to refresh again with the original refresh token - must fail
  await TestValidator.error(
    "original refresh token should be invalidated",
    async () => {
      await authorize_user_refresh(refreshConnection, {
        body: {
          refreshToken: originalRefreshToken,
        },
      });
    },
  );
}
