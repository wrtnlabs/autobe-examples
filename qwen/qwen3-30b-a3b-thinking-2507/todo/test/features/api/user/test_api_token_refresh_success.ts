import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration using authorization utility
  const userConnection: api.IConnection = { host: connection.host };
  const userResponse = await authorize_user_join(userConnection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // 2. Token refresh using authorization utility
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: userResponse.token.refresh,
    },
  });
  // 3. Verify new tokens have 2-hour lifespan
  const now = new Date().getTime();
  const accessExpiredAt = new Date(refreshed.token.expired_at).getTime();
  const refreshableUntil = new Date(
    refreshed.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "Token expiration within 2 hours",
    accessExpiredAt - now <= 7200 * 1000,
  );
  TestValidator.predicate(
    "Refreshable until within 2 hours",
    refreshableUntil - now <= 7200 * 1000,
  );
}
