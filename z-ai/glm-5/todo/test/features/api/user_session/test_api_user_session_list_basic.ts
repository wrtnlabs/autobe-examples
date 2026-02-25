import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
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

/**
 * Test basic session list retrieval for authenticated users.
 *
 * 1. Create a new user account via join endpoint
 * 2. Retrieve the user's login sessions list
 * 3. Validate pagination structure and session data
 */
export async function test_api_user_session_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Retrieve session list with default pagination
  const sessionList = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {} satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate at least one session exists (created during join)
  TestValidator.predicate(
    "at least one session exists",
    () => sessionList.data.length >= 1,
  );
  // 4. Validate sessions belong to the authenticated user (privacy enforcement)
  for (const session of sessionList.data) {
    TestValidator.equals(
      "session belongs to authenticated user",
      session.user.id,
      authorized.id,
    );
  }
  // 5. Validate sessions are ordered by created_at descending (newest first)
  if (sessionList.data.length > 1) {
    for (let i = 0; i < sessionList.data.length - 1; i++) {
      const current = new Date(sessionList.data[i].created_at).getTime();
      const next = new Date(sessionList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "sessions ordered by created_at descending",
        () => current >= next,
      );
    }
  }
}
