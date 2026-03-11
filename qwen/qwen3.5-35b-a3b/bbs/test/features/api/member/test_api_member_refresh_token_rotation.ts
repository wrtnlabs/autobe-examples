import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store initial refresh token (R1) and access token (A1)
  const r1 = joinResult.token.refresh;
  const a1 = joinResult.token.access;
  // 2. First refresh with original refresh token (R1)
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_member_refresh(
    refreshConnection1,
    {
      body: { refresh: r1 } satisfies IEconomicPoliticalBoardMember.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Store new tokens from first refresh (A1, R2)
  const a1New = firstRefreshResult.token.access;
  const r2 = firstRefreshResult.token.refresh;
  // Verify first refresh generated different access token
  TestValidator.notEquals(
    "first refresh generates new access token",
    a1,
    a1New,
  );
  // 3. Second refresh with new refresh token (R2)
  const refreshConnection2: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_member_refresh(
    refreshConnection2,
    {
      body: { refresh: r2 } satisfies IEconomicPoliticalBoardMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // Store new tokens from second refresh (A2, R3)
  const a2 = secondRefreshResult.token.access;
  const r3 = secondRefreshResult.token.refresh;
  // Verify second refresh generated different tokens
  TestValidator.notEquals(
    "second refresh generates new access token",
    a1New,
    a2,
  );
  TestValidator.notEquals("second refresh generates new refresh token", r2, r3);
  // 4. Attempt to use old refresh token (R1) - should fail
  await TestValidator.error(
    "original refresh token R1 is invalidated",
    async () => {
      const invalidRefreshConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_refresh(invalidRefreshConnection, {
        body: { refresh: r1 } satisfies IEconomicPoliticalBoardMember.IRefresh,
      });
    },
  );
  // 5. Validate all tokens are unique
  TestValidator.notEquals("R1 should differ from R2", r1, r2);
  TestValidator.notEquals("R2 should differ from R3", r2, r3);
  TestValidator.notEquals("All access tokens should be unique", a1, a2);
  // 6. Verify token expiration timestamps are updated
  // Access token expiration should be refreshed
  TestValidator.predicate(
    "first refresh access token expiration is updated",
    firstRefreshResult.token.expired_at > joinResult.token.expired_at,
  );
  // Second refresh should also update expiration
  TestValidator.predicate(
    "second refresh access token expiration is updated",
    secondRefreshResult.token.expired_at > firstRefreshResult.token.expired_at,
  );
}