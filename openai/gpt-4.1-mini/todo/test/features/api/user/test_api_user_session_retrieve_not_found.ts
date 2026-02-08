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

export async function test_api_user_session_retrieve_not_found(
  connection: api.IConnection,
) {
  // Create a user connection and authorize user registration
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin =
    typia.random<IMultiUserTodoUser.IJoin>();
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // Generate a random session UUID which does not exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Try to retrieve session with the non-existent sessionId and expect a 404 HTTP error
  await TestValidator.httpError(
    "retrieving non-existent session returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.sessions.at(userConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
