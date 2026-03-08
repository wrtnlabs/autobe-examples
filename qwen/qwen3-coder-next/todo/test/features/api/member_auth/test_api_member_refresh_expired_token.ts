import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMemberSession.IJoin;
  const joined = await api.functional.todoApp.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);
  // 2. Login to obtain initial tokens
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies ITodoAppMemberSession.ILogin;
  const logged = await api.functional.todoApp.auth.member.login(connection, {
    body: loginBody,
  });
  typia.assert(logged);
  // 3. Simulate expired refresh token using an obviously invalid token
  // This simulates the scenario where a refresh token has expired or been invalidated
  const expiredRefreshToken = "00000000-0000-0000-0000-000000000000" as const;
  // 4. Try to refresh with expired/invalid token
  const refreshBody = {
    refresh_token: expiredRefreshToken,
  } satisfies ITodoAppMemberSession.IRefresh;
  await TestValidator.error("expired refresh token should fail", async () => {
    await api.functional.todoApp.auth.member.refresh(connection, {
      body: refreshBody,
    });
  });
}
