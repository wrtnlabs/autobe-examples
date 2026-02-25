import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_list_expired_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://google.com",
    ip: null,
  } satisfies IMultiUserTodoUser.IJoin;
  const authorized = await authorize_user_join(connection, { body: joinBody });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Helper function to check all sessions are expired
  function allExpired(sessions: IMultiUserTodoUserSession.ISummary[]): boolean {
    const now = new Date();
    return sessions.every(
      (s) => new Date(s.expired_at).getTime() <= now.getTime(),
    );
  }
  // 3. Test multiple variations of expired:true filter
  const testCases: Array<Partial<IMultiUserTodoUserSession.IRequest>> = [
    { expired: true },
    { expired: true, page: 1, pageSize: 5 },
    { expired: true, page: 2, pageSize: 2 },
    { expired: true, limit: 10 },
    {
      expired: true,
      expiredAtFrom: new Date(0).toISOString(),
      expiredAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    },
  ];
  for (const reqPartial of testCases) {
    const body = reqPartial satisfies IMultiUserTodoUserSession.IRequest;
    // Call user sessions list with expired filter
    const result = await api.functional.multiUserTodo.user.sessions.index(
      userConnection,
      {
        body: { ...body },
      },
    );
    typia.assert(result);
    // Validate pagination info
    TestValidator.predicate(
      "pagination current page >= 1",
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      result.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      result.pagination.records >= 0,
    );
    // Validate all sessions are expired
    TestValidator.predicate("all sessions expired", allExpired(result.data));
    // Validate no sessions are deleted
    TestValidator.predicate(
      "no sessions deleted",
      !result.data.some((s) => s.deleted_at !== null),
    );
    // Validate all sessions belong to authorized user by checking the authorization token access usage
    // As we don't have direct user ID in session, this test assumes that the sessions returned correspond to the user
    // (negative test could be a test for unauthorized access, but here just trust the API)
  }
}
