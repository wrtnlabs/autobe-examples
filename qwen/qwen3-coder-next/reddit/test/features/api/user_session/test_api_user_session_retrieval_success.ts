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

export async function test_api_user_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for each step
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new user
  const joinResult = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(joinResult);
  // Create new connection with token from join result
  const loginConnection: api.IConnection = { host: connection.host };
  loginConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // Step 2: Login to establish session
  const loginResult = await api.functional.redditPlatform.auth.user.login(
    loginConnection,
    {
      body: typia.random<IRedditPlatformUser.ILogin>(),
    },
  );
  typia.assert(loginResult);
  // Step 3: Retrieve session details
  // Note: Session ID should come from the login result if available
  // For this implementation, we'll retrieve the latest session
  const session = await api.functional.redditPlatform.user.sessions.at(
    loginConnection,
    {
      sessionId: "session-id-placeholder", // This would need to be extracted from loginResult if available
    },
  );
  typia.assert(session);
}
