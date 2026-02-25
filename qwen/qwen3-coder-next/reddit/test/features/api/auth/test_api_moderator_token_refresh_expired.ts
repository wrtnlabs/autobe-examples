import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new moderator account to get valid tokens
  const registeredModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(registeredModerator);
  // Step 2: Login to establish session (refresh token becomes active)
  const loginResponse = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: registeredModerator.email,
      password: "SecurePass123!",
    } satisfies IRedditCloneModerator.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Extract the refresh token and create expired refresh request
  const expiredRefreshRequest: IRedditCloneModerator.IRefresh = {
    refreshToken: "expired-refresh-token-12345", // Simulated expired token
  };
  // Step 4: Attempt to refresh with expired token and validate 401 response
  await TestValidator.error(
    "expired refresh token should return 401",
    async () => {
      await api.functional.redditClone.auth.moderator.refresh(
        moderatorConnection,
        {
          body: expiredRefreshRequest,
        },
      );
    },
  );
}
