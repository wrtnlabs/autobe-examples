import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
  });
  typia.assert(joinedUser);
  const refreshToken = joinedUser.token.refresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedUser = await authorize_user_refresh(refreshConnection, {
    body: {
      refreshToken,
    } satisfies IEconomicPoliticalDiscussionBoardUser.IRefresh,
  });
  typia.assert(refreshedUser);
  const expiredAt = new Date(joinedUser.token.expired_at).getTime();
  const refreshableUntil = new Date(
    joinedUser.token.refreshable_until,
  ).getTime();
  const newExpiredAt = new Date(refreshedUser.token.expired_at).getTime();
  const newRefreshableUntil = new Date(
    refreshedUser.token.refreshable_until,
  ).getTime();
  const accessDiff = newExpiredAt - Date.now();
  TestValidator.predicate(
    "access token valid for 15 minutes",
    accessDiff >= 15 * 60 * 1000 && accessDiff <= 15 * 60 * 1000 + 500,
  );
  const refreshDiff = newRefreshableUntil - refreshableUntil;
  TestValidator.predicate(
    "refresh token valid for 7 days",
    refreshDiff >= 7 * 24 * 60 * 60 * 1000 &&
      refreshDiff <= 7 * 24 * 60 * 60 * 1000 + 500,
  );
}
