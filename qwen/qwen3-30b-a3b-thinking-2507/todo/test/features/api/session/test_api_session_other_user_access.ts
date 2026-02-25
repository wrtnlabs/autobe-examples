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

export async function test_api_session_other_user_access(
  connection: api.IConnection,
): Promise<void> {
  const user1Connection: api.IConnection = { host: connection.host };
  const user1: ITodoAppUser.IAuthorized = await authorize_user_join(
    user1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user1password123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2: ITodoAppUser.IAuthorized = await authorize_user_join(
    user2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user2password123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user2);
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "Session access by another user should return 404",
    404,
    async () => {
      await api.functional.todoApp.user.sessions.at(user2Connection, {
        sessionId: sessionId,
      });
    },
  );
}
