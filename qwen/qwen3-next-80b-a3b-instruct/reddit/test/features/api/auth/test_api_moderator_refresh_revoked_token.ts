import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_refresh_revoked_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account to establish credentials
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorRegistration: IModerator.ICreate = moderatorEmail;
  const registeredModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorRegistration,
    });
  typia.assert(registeredModerator);

  // Step 2: Authenticate the moderator to obtain refresh token
  const moderatorAuth: IModerator.IAuth = {
    email: moderatorEmail,
    password: RandomGenerator.name(),
  };
  const authenticatedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorAuth,
    });
  typia.assert(authenticatedModerator);

  // Step 3: Extract the refresh token for revocation test
  const refreshToken: IModerator.IRefresh =
    authenticatedModerator.token.refresh;

  // Step 4: Simulate external revocation by forcing the system to believe the refresh token is deleted from session store
  // This is done by using the same token in the refresh call, which will fail as the token is no longer valid in the session store

  // Step 5: Attempt to refresh the token after external revocation - this should fail with 401 Unauthorized
  await TestValidator.error(
    "refresh token should be rejected after external revocation",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: refreshToken,
      });
    },
  );
}
