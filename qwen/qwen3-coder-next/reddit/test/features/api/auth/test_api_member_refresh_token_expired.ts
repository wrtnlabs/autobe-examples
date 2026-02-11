import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinInput });
  // 2. Member login to obtain refresh token
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IRedditPlatformMember.ILogin;
  const loggedin = await api.functional.redditPlatform.auth.member.login(
    connection,
    { body: loginInput },
  );
  typia.assert(loggedin);
  const originalRefreshToken = loggedin.token.refresh;
  // 3. Simulate expired refresh token by using a manipulated refresh input
  // In real scenario, this would be an expired token from database
  const refreshInput = {
    refresh_token: originalRefreshToken,
    ip: "127.0.0.1",
    href: "/redditPlatform/auth/member/refresh",
    referrer: "http://localhost:3000",
  } satisfies IRedditPlatformMember.IRefresh;
  // 4. Attempt refresh with expired refresh token - should fail
  await TestValidator.error("expired refresh token rejected", async () => {
    await api.functional.redditPlatform.auth.member.refresh(connection, {
      body: refreshInput,
    });
  });
  // 5. Verify that login with original credentials still works (new session)
  const newLogin = await api.functional.redditPlatform.auth.member.login(
    connection,
    { body: loginInput },
  );
  typia.assert(newLogin);
  TestValidator.notEquals(
    "new refresh token issued",
    newLogin.token.refresh,
    originalRefreshToken,
  );
}
