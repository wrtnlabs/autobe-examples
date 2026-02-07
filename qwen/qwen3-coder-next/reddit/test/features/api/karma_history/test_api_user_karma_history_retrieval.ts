import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformKarmaHistory";
import type { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection using join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user
  const userAuth = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        username: RandomGenerator.name(2),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: userAuth.token.access,
  };
  // Test 1: Retrieve karma history for user with no history
  const emptyHistory =
    await api.functional.redditPlatform.user.karma.history.index(
      authenticatedConnection,
    );
  typia.assert(emptyHistory);
  TestValidator.equals(
    "empty history pagination",
    emptyHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty history data length",
    emptyHistory.data.length,
    0,
  );
  TestValidator.predicate(
    "empty pagination valid",
    emptyHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "empty pagination limit valid",
    emptyHistory.pagination.limit > 0,
  );
  // Test 2: Unauthorized access should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () =>
      await api.functional.redditPlatform.user.karma.history.index(
        unauthorizedConnection,
      ),
  );
  // Test 3: Pagination validation
  TestValidator.predicate(
    "pagination has required fields",
    emptyHistory.pagination.current !== undefined &&
      emptyHistory.pagination.limit !== undefined &&
      emptyHistory.pagination.records !== undefined &&
      emptyHistory.pagination.pages !== undefined,
  );
}
