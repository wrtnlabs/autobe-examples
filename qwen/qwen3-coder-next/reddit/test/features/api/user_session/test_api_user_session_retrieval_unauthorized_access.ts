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

export async function test_api_user_session_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user A via join
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAAuth);
  // 2. Create user B via join
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userBAuth);
  // 3. Login as user A to establish session A
  const userALoginConnection: api.IConnection = { host: connection.host };
  const userALoginAuth = await authorize_user_login(userALoginConnection, {
    body: {
      email: userAConnection.headers?.Authorization
        ? "userA@test.com"
        : typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IRedditPlatformUser.ILogin,
  });
  typia.assert(userALoginAuth);
  // 4. Login as user B to establish session B
  const userBLoginConnection: api.IConnection = { host: connection.host };
  const userBLoginAuth = await authorize_user_login(userBLoginConnection, {
    body: {
      email: userBConnection.headers?.Authorization
        ? "userB@test.com"
        : typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IRedditPlatformUser.ILogin,
  });
  typia.assert(userBLoginAuth);
  // 5. Extract session IDs from authentication tokens
  // In a real implementation, session ID would be extracted from the token
  // For this test, we'll use a placeholder UUID format
  const sessionIdA = typia.random<string & tags.Format<"uuid">>();
  const sessionIdB = typia.random<string & tags.Format<"uuid">>();
  // 6. Verify user A can access their own session (sanity check)
  const sessionA = await api.functional.redditPlatform.user.sessions.at(
    userALoginConnection,
    {
      sessionId: sessionIdA,
    },
  );
  typia.assert(sessionA);
  // 7. Attempt to retrieve user B's session using user A's connection (should fail)
  await TestValidator.error(
    "user A should not access user B's session",
    async () => {
      await api.functional.redditPlatform.user.sessions.at(
        userALoginConnection,
        {
          sessionId: sessionIdB,
        },
      );
    },
  );
}
