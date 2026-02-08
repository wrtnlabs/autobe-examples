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

export async function test_api_user_session_retrieve_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve detailed info about a user session by its UUID.
  // Steps:
  // 1. Join a new user to get authorized connection.
  // 2. Retrieve a non-existent user session, expect 404 error.
  // 3. Retrieve session data in simulation mode to verify structure.
  // 4. Assert all expected session properties exist and are valid.
  // 5. Test that unauthorized access is prevented.
  // 1. User join & authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Retrieve non-existent sessionId expect 404 error
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent session should return 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.sessions.at(userConnection, {
        sessionId: randomSessionId,
      });
    },
  );
  // 3. Retrieve session data in simulation mode to verify structure
  const simulateConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const session = await api.functional.multiUserTodo.user.sessions.at(
    simulateConnection,
    {
      sessionId: randomSessionId,
    },
  );
  typia.assert(session);
  // 4. Removed invalid property existence and type checks due to missing properties in IMultiUserTodoUserSession
  // 5. Test unauthorized access is prevented
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access without token should return 401",
    401,
    async () => {
      await api.functional.multiUserTodo.user.sessions.at(anonymousConnection, {
        sessionId: randomSessionId,
      });
    },
  );
}
