import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_refreshable_until_enforced(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join to obtain initial authorization token pair
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const join = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(join);
  const originalRefreshToken = join.token.refresh;
  const originalRefreshableUntil = join.token.refreshable_until;
  // 2) Refresh immediately (within window)
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshed1 = await authorize_member_refresh(refreshConnection1, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshed1);
  const newExpiredAt1 = refreshed1.token.expired_at;
  const newRefreshableUntil1 = refreshed1.token.refreshable_until;
  // Confirm new token pair semantics: values must be present and parseable.
  TestValidator.predicate(
    "new expired_at is after join expired_at or has changed",
    new Date(newExpiredAt1).getTime() !==
      new Date(join.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "new refreshable_until is after or equal to original",
    new Date(newRefreshableUntil1).getTime() >=
      new Date(originalRefreshableUntil).getTime(),
  );
  // 3) Wait until original refreshable_until is exceeded
  const targetTime = new Date(originalRefreshableUntil).getTime();
  const nowTime = Date.now();
  const sleepMs = Math.max(0, targetTime - nowTime + 50);
  if (sleepMs > 0) await new Promise((r) => setTimeout(r, sleepMs));
  // 4) Attempt refresh again with the same ORIGINAL refresh token (must be rejected)
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh should be rejected after refreshable_until is exceeded for the original token",
    async () => {
      await authorize_member_refresh(refreshConnection2, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
}
