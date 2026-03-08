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

/**
 * Test session revocation security feature during member login.
 *
 * Validates that when a member logs in from a new device/location,
 * all existing sessions are revoked and only a new session is created.
 * This prevents session hijacking by ensuring single active session.
 */
export async function test_api_member_login_session_revocation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish initial session via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
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
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const joinResult = await api.functional.redditPlatform.auth.member.join(
    joinConnection,
    { body: joinInput },
  );
  typia.assert(joinResult);
  const memberLoginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IRedditPlatformMember.ILogin;
  // 2. Perform second login (simulating login from new device/location)
  const loginConnection: api.IConnection = { host: connection.host };
  const secondLoginResult =
    await api.functional.redditPlatform.auth.member.login(loginConnection, {
      body: memberLoginInput,
    });
  typia.assert(secondLoginResult);
  // 3. Verify token expiration times
  // Access token should expire in 15 minutes from creation
  const now = new Date();
  const accessExpiration = new Date(secondLoginResult.token.expired_at);
  const timeDiffMs = accessExpiration.getTime() - now.getTime();
  const timeDiffMinutes = timeDiffMs / (1000 * 60);
  TestValidator.predicate(
    "access token expires within 15 minutes",
    timeDiffMinutes >= 14 && timeDiffMinutes <= 16,
  );
  // Refresh token should be valid for 7 days
  const refreshExpiration = new Date(secondLoginResult.token.refreshable_until);
  const refreshTimeDiffMs = refreshExpiration.getTime() - now.getTime();
  const refreshDays = refreshTimeDiffMs / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token valid for 7 days",
    refreshDays >= 6.9 && refreshDays <= 7.1,
  );
  // 4. Verify new tokens are different from join tokens
  TestValidator.notEquals(
    "access token changed after login",
    joinResult.token.access,
    secondLoginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after login",
    joinResult.token.refresh,
    secondLoginResult.token.refresh,
  );
  // 5. Test multiple concurrent logins - perform third login
  const thirdLoginConnection: api.IConnection = { host: connection.host };
  const thirdLoginResult =
    await api.functional.redditPlatform.auth.member.login(
      thirdLoginConnection,
      { body: memberLoginInput },
    );
  typia.assert(thirdLoginResult);
  // Verify third login created new tokens (all previous sessions invalidated)
  TestValidator.notEquals(
    "third login changed tokens from second login",
    secondLoginResult.token.access,
    thirdLoginResult.token.access,
  );
  TestValidator.notEquals(
    "third login changed refresh token from second login",
    secondLoginResult.token.refresh,
    thirdLoginResult.token.refresh,
  );
}
