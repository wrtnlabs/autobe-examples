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

export async function test_api_user_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Login with new user
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(loginConnection, {
    body: {
      email: user.email,
      password: "1234",
    } satisfies IEconomyPoliticsBoardUser.ILogin,
  });
  // 3. Generate random session ID for test purposes
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve session details
  const session = await api.functional.economyPoliticsBoard.user.sessions.at(
    loginConnection,
    { sessionId },
  );
  typia.assert(session);
  // 5. Validate security metadata business logic
  TestValidator.predicate("IP address exists", session.ip.length > 0);
  TestValidator.predicate("URL referrer exists", session.referrer.length > 0);
  TestValidator.predicate(
    "Session duration is reasonable",
    new Date(session.updated_at).getTime() -
      new Date(session.created_at).getTime() >
      0,
  );
}
