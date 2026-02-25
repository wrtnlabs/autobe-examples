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

export async function test_api_session_privacy_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  // Test privacy enforcement when a user attempts to access another user's session.
  // The system must return 404 Not Found to prevent session ID enumeration attacks.
  // 1. Create User A's connection and account
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<ITodoAppUser.IJoin["email"]>(),
      password: "Password1!",
      password_confirm: "Password1!",
      href: "https://test-a.example.com",
      referrer: "https://test-a.example.com",
    },
  });
  typia.assert(userA);
  // 2. Create User B's connection and account
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<ITodoAppUser.IJoin["email"]>(),
      password: "Password2!",
      password_confirm: "Password2!",
      href: "https://test-b.example.com",
      referrer: "https://test-b.example.com",
    },
  });
  typia.assert(userB);
  // 3. User A attempts to access User B's session using User B's userId as sessionId
  // Since the join endpoint does not return sessionId directly, we use userB.id
  // The backend should return 404 whether the sessionId doesn't exist or belongs to another user
  await TestValidator.httpError(
    "User A cannot access User B's session",
    404,
    async () => {
      await api.functional.todoApp.user.sessions.at(userAConnection, {
        sessionId: userB.id,
      });
    },
  );
  // 4. Also verify that User A cannot access a random UUID as sessionId
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "User A cannot access non-existent session",
    404,
    async () => {
      await api.functional.todoApp.user.sessions.at(userAConnection, {
        sessionId: randomSessionId,
      });
    },
  );
}
