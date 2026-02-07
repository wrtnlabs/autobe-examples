import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_retrieval_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration via utility function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoUser.IJoin,
  });
  // 2. Generate random session ID
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve session details
  const session = await api.functional.todo.user.sessions.at(userConnection, {
    sessionId,
  });
  typia.assert(session);
  // 4. Validate required session fields
  TestValidator.equals("session ID is present", typeof session.id, "string");
  TestValidator.equals(
    "session IP address is present",
    typeof session.ip,
    "string",
  );
  TestValidator.equals(
    "session href is present",
    typeof session.href,
    "string",
  );
  TestValidator.equals(
    "session referrer is present",
    typeof session.referrer,
    "string",
  );
  TestValidator.equals(
    "session created_at is present",
    typeof session.created_at,
    "string",
  );
  TestValidator.equals(
    "session expired_at is present",
    typeof session.expired_at,
    "string",
  );
  TestValidator.equals(
    "session user reference is present",
    typeof session.user,
    "object",
  );
}
