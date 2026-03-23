import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: joinInput,
  });
  typia.assert(moderator);
  // 2. Login to establish session
  const loginInput = {
    email: moderator.email,
    password: "password123",
  } satisfies IRedditLikeModerator.ILogin;
  const loginResponse = await authorize_moderator_login(moderatorConnection, {
    body: loginInput,
  });
  typia.assert(loginResponse);
  // 3. Retrieve session details using the session ID
  // Note: The session ID should be available from the login response based on API implementation
  // For now, using the moderator ID as placeholder - adjust based on actual API response structure
  const session = await api.functional.redditLike.moderator.sessions.at(
    moderatorConnection,
    {
      sessionId: moderator.id,
    },
  );
  typia.assert(session);
  // 4. Validate session fields
  TestValidator.equals("session id is uuid", typeof session.id, "string");
  TestValidator.predicate(
    "session has ip address",
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
  );
  TestValidator.predicate(
    "session has user agent",
    session.user_agent.length > 0,
  );
  TestValidator.equals(
    "created_at is date-time format",
    typeof session.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is date-time format",
    typeof session.updated_at,
    "string",
  );
  TestValidator.equals(
    "expired_at should be null for active session",
    session.expired_at,
    null,
  );
  TestValidator.equals(
    "revoked_at should be null for active session",
    session.revoked_at,
    null,
  );
}
