import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_token_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as guest and obtain tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const guestResult = await api.functional.redditLike.auth.guest.join(
    guestConnection,
    {
      body: {
        device_id: typia.random<string & tags.Format<"uuid">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
        user_agent: RandomGenerator.name(),
      },
    },
  );
  typia.assert(guestResult);
  // Step 2: Verify access token expiration (2 hours)
  const now = new Date();
  const accessDate = new Date(guestResult.expired_at);
  const expectedAccessExp = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  TestValidator.equals(
    "access token expires in 2 hours",
    Math.abs(accessDate.getTime() - expectedAccessExp.getTime()) < 1000,
    true,
  );
  // Step 3: Validate refresh token expiration (14 days)
  const refreshDate = new Date(guestResult.token.refreshable_until);
  const expectedRefreshExp = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  TestValidator.equals(
    "refresh token expires in 14 days",
    Math.abs(refreshDate.getTime() - expectedRefreshExp.getTime()) < 1000,
    true,
  );
  // Step 4: Test refresh token flow
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.redditLike.auth.guest.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: guestResult.token.refresh,
      },
    },
  );
  typia.assert(refreshResult);
  TestValidator.notEquals(
    "refresh produces new access token",
    refreshResult.access,
    guestResult.access,
  );
  // Step 5: Verify refreshed token also expires in 2 hours
  const refreshedAccessDate = new Date(refreshResult.expired_at);
  const expectedRefreshedAccessExp = new Date(
    new Date().getTime() + 2 * 60 * 60 * 1000,
  );
  TestValidator.equals(
    "refreshed access token expires in 2 hours",
    Math.abs(
      refreshedAccessDate.getTime() - expectedRefreshedAccessExp.getTime(),
    ) < 1000,
    true,
  );
}
