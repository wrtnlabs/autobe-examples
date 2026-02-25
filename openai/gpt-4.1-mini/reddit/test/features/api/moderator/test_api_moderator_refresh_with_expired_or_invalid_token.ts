import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_with_expired_or_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Test the behavior when attempting to refresh the moderator JWT token with an expired or invalid refresh token.
  // 1. Register a new moderator via /communityPlatform/auth/moderator/join dependency.
  // 2. Use an expired or malformed refresh token to call the refresh endpoint.
  // 3. Expect HTTP 401 Unauthorized or appropriate error indicating invalid token.
  // 4. Confirm that no new tokens are issued and the user must login again.
  // Create a new moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register a new moderator with random email and username
  const email = `${RandomGenerator.alphabets(6)}@example.com`;
  const username = `moderator_${RandomGenerator.alphabets(4)}`;
  const joinBody: Partial<ICommunityPlatformModerator.IJoin> = {
    email,
    username,
    displayName: "Test Mod",
    bio: "Bio",
    avatarUrl: null,
  };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Attempt refresh with malformed invalid token
  const invalidRefreshToken1 = "this.is.not.a.valid.token";
  await TestValidator.httpError(
    "refresh with malformed refresh token",
    401,
    async () => {
      await authorize_moderator_refresh(moderatorConnection, {
        body: { refreshToken: invalidRefreshToken1 },
      });
    },
  );
  // Attempt refresh with invalid expired token (simulate with random UUID)
  const invalidRefreshToken2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "refresh with expired refresh token",
    401,
    async () => {
      await authorize_moderator_refresh(moderatorConnection, {
        body: { refreshToken: invalidRefreshToken2 },
      });
    },
  );
}
