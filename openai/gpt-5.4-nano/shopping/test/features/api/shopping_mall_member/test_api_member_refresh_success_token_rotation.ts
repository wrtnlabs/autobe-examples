import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join to obtain tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joined);
  const oldAccessToken = joined.token.access;
  const refreshToken = joined.token.refresh;
  // 2) Refresh using refreshToken
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: { refreshToken } satisfies IShoppingMallMember.IRefresh,
  });
  typia.assert(refreshed);
  // 3) Validate identity + tokens
  TestValidator.equals("member id matches", refreshed.id, joined.id);
  TestValidator.equals("member email matches", refreshed.email, joined.email);
  TestValidator.predicate(
    "access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  // 4) Validate expiration semantics (future relative to now)
  const now = Date.now();
  const expiredAt = new Date(refreshed.token.expired_at).getTime();
  const refreshableUntil = new Date(
    refreshed.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("access expired_at is future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is future",
    refreshableUntil > now,
  );
  // 5) Validate access token rotation
  TestValidator.notEquals(
    "access token rotated",
    oldAccessToken,
    refreshed.token.access,
  );
}
