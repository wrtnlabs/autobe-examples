import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_auth_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account and obtain initial token pair
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Store initial tokens
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 3. Call refresh endpoint with initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IHrmPlatformMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Verify new access token is different from initial
  const newAccessToken = refreshedAuth.token.access;
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    newAccessToken,
  );
  // 5. Verify new refresh token is different from initial
  const newRefreshToken = refreshedAuth.token.refresh;
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    newRefreshToken,
  );
  // 6. Attempt to use old refresh token again - should be rejected with 401
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token rejected", async () => {
    await api.functional.hrmPlatform.auth.member.refresh(oldTokenConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    });
  });
  // 7. Verify new refresh token can be used for subsequent refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshedAuth = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    },
  );
  typia.assert(secondRefreshedAuth);
  // Verify second refresh also produces new tokens
  TestValidator.notEquals(
    "second refresh access token differs",
    newAccessToken,
    secondRefreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "second refresh refresh token differs",
    newRefreshToken,
    secondRefreshedAuth.token.refresh,
  );
}
