import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account and login to obtain valid refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.redditLike.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeAdmin.IJoin,
    },
  );
  typia.assert(joined);
  const loggedin = await api.functional.redditLike.auth.admin.login(
    adminConnection,
    {
      body: {
        email: joined.token.refresh,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeAdmin.ILogin,
    },
  );
  typia.assert(loggedin);
  // Step 2: Manually create an expired refresh token
  const expiredRefresh =
    "expired-refresh-token-" + RandomGenerator.alphaNumeric(32);
  // Step 3: Attempt to refresh with expired token and expect error
  await TestValidator.error("expired refresh token should fail", async () => {
    await api.functional.redditLike.auth.admin.refresh(adminConnection, {
      body: {
        refresh: expiredRefresh,
      } satisfies IRedditLikeAdmin.IRefresh,
    });
  });
}
