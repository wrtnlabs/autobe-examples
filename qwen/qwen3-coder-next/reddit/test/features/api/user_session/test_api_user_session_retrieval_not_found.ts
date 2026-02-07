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

export async function test_api_user_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection following connection isolation pattern
  const userConnection: api.IConnection = { host: connection.host };
  // Use a non-existent session ID (valid UUID format but not in database)
  const nonExistentSessionId = "00000000-0000-0000-0000-000000000000";
  // Attempt to retrieve non-existent session - should return 404
  await TestValidator.error(
    "should return 404 for non-existent session",
    async () => {
      await api.functional.redditPlatform.user.sessions.at(userConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
