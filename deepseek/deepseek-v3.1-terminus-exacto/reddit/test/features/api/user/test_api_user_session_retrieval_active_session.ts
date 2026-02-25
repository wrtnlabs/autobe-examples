import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_retrieval_active_session(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Since the session ID is not directly available in the response,
  // we need to use a valid UUID for testing the endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the session details using the authenticated user connection
  const session = await api.functional.communityPlatform.user.sessions.at(
    userConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // Validate session metadata
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate(
    "access token exists",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    session.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "IP address is valid IPv4",
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(session.ip),
  );
  TestValidator.predicate("user agent exists", session.user_agent.length > 0);
  TestValidator.predicate(
    "created at timestamp is valid",
    !isNaN(new Date(session.created_at).getTime()),
  );
  TestValidator.predicate(
    "expired at timestamp is valid",
    !isNaN(new Date(session.expired_at).getTime()),
  );
  // Validate user relationship data
  TestValidator.predicate("user ID exists", session.user.id.length > 0);
  TestValidator.predicate("username exists", session.user.username.length > 0);
  TestValidator.predicate(
    "created at timestamp is valid",
    !isNaN(new Date(session.user.created_at).getTime()),
  );
}
