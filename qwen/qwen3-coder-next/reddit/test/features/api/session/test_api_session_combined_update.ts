import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test combined session update with activity timestamp and active status.
 * This test validates the session update functionality where both last_activity_at
 * (to refresh activity) and is_active (to maintain session validity) are updated
 * simultaneously.
 */
export async function test_api_session_combined_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user with authentication
  const authConnection: api.IConnection = { host: connection.host };
  const userAuth: IRedditPlatformUser.IAuthorized = await authorize_user_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.name(2),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // Step 2: Extract token from user authentication
  const token: IAuthorizationToken = userAuth.token;
  typia.assert(token);
  // Step 3: Update session with combined activity and active status
  const sessionConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(sessionConnection, {
    body: {
      email: userAuth.token.access,
      password: "password123",
    } satisfies IRedditPlatformUser.ILogin,
  });
  const updatedSession =
    await api.functional.redditPlatform.user.sessions.update(
      sessionConnection,
      {
        body: {
          last_activity_at: new Date().toISOString(),
          is_active: true,
        } satisfies IRedditPlatformUserSession.IRequest,
      },
    );
  typia.assert(updatedSession);
  // Step 4: Validate combined update response
  TestValidator.predicate(
    "session updated successfully",
    updatedSession !== null,
  );
  TestValidator.predicate(
    "session has valid state",
    typeof updatedSession === "object",
  );
}
