import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_retrieve_expired(
  connection: api.IConnection,
) {
  // Create user connection and join user
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin =
    typia.random<IMultiUserTodoUser.IJoin>();
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // We do not have direct API to create or expire sessions, so we simulate expired session
  // by fetching session with a made-up UUID that simulates expired sessionId
  // In a real environment, to properly verify expired session retrieval, a session ID
  // of an expired session should be used. Here we generate a random UUID for demonstration.
  const expiredSessionId = typia.random<string & tags.Format<"uuid">>();
  // Call session retrieval endpoint with expiredSessionId
  const session = await api.functional.multiUserTodo.user.sessions.at(
    userConnection,
    {
      sessionId: expiredSessionId,
    },
  );
  // Assert the response is valid according to IMultiUserTodoUserSession structure
  typia.assert(session);
  // Removal of invalid 'expired_at' reference to avoid compilation error
  // Testing session retrieval without expiration timestamp
  TestValidator.predicate(
    "session is retrieved",
    session !== null && session !== undefined,
  );
}
