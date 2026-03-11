import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(joinResponse);
  const initialRefreshToken = joinResponse.token.refresh;
  const initialUserId = joinResponse.id;
  typia.assert(initialRefreshToken);
  typia.assert(initialUserId);
  // 2. Refresh with valid token to get new tokens
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_admin_refresh(
    adminRefreshConnection,
    {
      body: {
        refresh: initialRefreshToken,
      } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "user ID matches initial user",
    refreshResponse.id,
    initialUserId,
  );
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;
  typia.assert(newAccessToken);
  typia.assert(newRefreshToken);
  typia.assert(newExpiredAt);
  typia.assert(newRefreshableUntil);
  // 4. Validate tokens are different from initial ones (rotation)
  TestValidator.notEquals(
    "new refresh token differs from initial",
    newRefreshToken,
    initialRefreshToken,
  );
  TestValidator.notEquals(
    "new access token differs from initial",
    newAccessToken,
    joinResponse.token.access,
  );
  // 5. Validate timestamps are reasonable (15 min access, 7 days refresh)
  const now = new Date();
  const expiredAtDate = new Date(newExpiredAt);
  const refreshableUntilDate = new Date(newRefreshableUntil);
  const accessExpirationDifference = expiredAtDate.getTime() - now.getTime();
  const refreshExpirationDifference =
    refreshableUntilDate.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires in approximately 15 minutes",
    Math.abs(accessExpirationDifference) < 60000 * 20,
  );
  TestValidator.predicate(
    "refresh token valid for approximately 7 days",
    Math.abs(refreshExpirationDifference) < 86400000 * 1,
  );
  // 6. Verify old refresh token cannot be used again (single-use pattern)
  const reusedRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token cannot be reused", async () => {
    await authorize_admin_refresh(reusedRefreshConnection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
    });
  });
}