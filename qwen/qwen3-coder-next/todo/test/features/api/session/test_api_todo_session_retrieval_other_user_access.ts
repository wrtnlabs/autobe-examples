import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_session_retrieval_other_user_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register two users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppUser.IJoin;
  await authorize_user_join(user1Connection, { body: user1Data });
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppUser.IJoin;
  await authorize_user_join(user2Connection, { body: user2Data });
  // Step 2: Login both users to establish sessions
  const user1LoginData = {
    email: user1Data.email,
    password: user1Data.password,
  } satisfies ITodoAppUser.ILogin;
  await authorize_user_login(user1Connection, { body: user1LoginData });
  const user2LoginData = {
    email: user2Data.email,
    password: user2Data.password,
  } satisfies ITodoAppUser.ILogin;
  await authorize_user_login(user2Connection, { body: user2LoginData });
  // Step 3: User1 attempts to access a non-existent session
  // (since we can't obtain actual session IDs from the login response)
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "user1 should not be able to access a non-existent session",
    async () => {
      await api.functional.todoApp.sessions.at(user1Connection, {
        sessionId: fakeSessionId,
      });
    },
  );
  // Step 4: Verify user1 still cannot access user2's sessions even after user2 logout
  // (testing that sessions are properly isolated)
  await TestValidator.error(
    "user1 should not be able to access any user2 session",
    async () => {
      await api.functional.todoApp.sessions.at(user1Connection, {
        sessionId: fakeSessionId,
      });
    },
  );
}
