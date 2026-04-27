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

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  // Save original tokens for later comparison
  const originalAccessToken: string = authorized.token.access;
  const originalRefreshToken: string = authorized.token.refresh;
  // 2. Call refresh endpoint with the original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: ITodoAppMember.IAuthorized = await authorize_member_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 3. Verify tokens have changed
  TestValidator.notEquals(
    "access token regenerated",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token regenerated",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 4. Verify timestamps are valid future dates
  const now: Date = new Date();
  const expiredAt: Date = new Date(refreshed.token.expired_at);
  const refreshableUntil: Date = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is a future timestamp",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is a future timestamp",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 5. Verify the new refresh token works by performing a second refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefresh: ITodoAppMember.IAuthorized =
    await authorize_member_refresh(secondRefreshConnection, {
      body: {
        refresh_token: refreshed.token.refresh,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(secondRefresh);
  // Verify the second refresh also returned new tokens
  TestValidator.notEquals(
    "second access token differs from first refresh",
    secondRefresh.token.access,
    refreshed.token.access,
  );
}
