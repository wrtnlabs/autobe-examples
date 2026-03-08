import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_with_revoked_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and capture initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(initialAuth);
  typia.assert(initialAuth.token);
  // Capture initial refresh token (token_A)
  typia.assertGuard(initialAuth.token.refresh);
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. First refresh - use token_A to get new tokens (token_B)
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_member_refresh(refreshConnection1, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IRedditPlatformMember.IRefresh,
  });
  typia.assert(firstRefresh);
  typia.assert(firstRefresh.token);
  // Capture new refresh token (token_B)
  typia.assertGuard(firstRefresh.token.refresh);
  const newRefreshToken = firstRefresh.token.refresh;
  // 3. Attempt to reuse old refresh token (token_A) - should fail with 401
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be invalid after use",
    async () => {
      await authorize_member_refresh(reuseConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditPlatformMember.IRefresh,
      });
    },
  );
  // 4. Verify new refresh token (token_B) works correctly
  const validConnection: api.IConnection = { host: connection.host };
  const validRefresh = await authorize_member_refresh(validConnection, {
    body: {
      refresh_token: newRefreshToken,
    } satisfies IRedditPlatformMember.IRefresh,
  });
  typia.assert(validRefresh);
  typia.assert(validRefresh.token);
  // 5. Validate token rotation worked - access token should be new
  TestValidator.notEquals(
    "new access token different from initial",
    initialAuth.token.access,
    firstRefresh.token.access,
  );
  // 6. Validate refresh token rotation worked
  TestValidator.notEquals(
    "refresh token rotated after refresh",
    initialRefreshToken,
    newRefreshToken,
  );
  // 7. Validate refreshable_until has been updated for new token
  TestValidator.notEquals(
    "refreshable_until updated",
    initialAuth.token.refreshable_until,
    firstRefresh.token.refreshable_until,
  );
}
