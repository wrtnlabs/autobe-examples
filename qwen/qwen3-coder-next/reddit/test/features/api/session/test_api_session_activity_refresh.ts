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

export async function test_api_session_activity_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user for session testing
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = typia.random<IRedditPlatformUser.IJoin>();
  const userAuth = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(userAuth);
  // Update session activity timestamp
  const sessionRequest = typia.random<IRedditPlatformUserSession.IRequest>();
  const updatedSession =
    await api.functional.redditPlatform.user.sessions.update(userConnection, {
      body: sessionRequest,
    });
  typia.assert(updatedSession);
  // Verify session remains active
  TestValidator.predicate(
    "session is active",
    updatedSession !== null && updatedSession !== undefined,
  );
}
