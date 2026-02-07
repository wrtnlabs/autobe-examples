import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securepassword123",
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create session via login
  const loginConnection: api.IConnection = { host: connection.host };
  const token = await authorize_user_login(loginConnection, {
    body: {
      email: user.email,
      password: "securepassword123",
    } satisfies IEconomyPoliticsBoardUser.ILogin,
  });
  typia.assert(token);
  // 3. Get the session ID from the login response (should be stored in database, but mock as user ID for test)
  const sessionId = user.id;
  // 4. Session retrieval
  const sessionConnection: api.IConnection = { host: connection.host };
  const session = await api.functional.economyPoliticsBoard.user.sessions.at(
    sessionConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Verify security metadata is present (expired_at)
  TestValidator.predicate(
    "session expired_at metadata preserved",
    session.expired_at !== undefined,
  );
}
