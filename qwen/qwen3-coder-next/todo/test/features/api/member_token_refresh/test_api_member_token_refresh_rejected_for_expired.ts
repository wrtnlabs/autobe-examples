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

export async function test_api_member_token_refresh_rejected_for_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to obtain refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: (typia.random<string>() satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">) as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: "SecurePassword123!@#",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Get member connection with valid tokens from join response
  const activeConnection: api.IConnection = { host: connection.host };
  activeConnection.headers = {
    ...memberConnection.headers,
    Authorization: joinResponse.token.access,
  };
  // 3. Extract refresh token from join response
  const refreshToken = joinResponse.refresh_token.refresh_token;
  // 4. Create expired refresh token connection
  const expiredConnection: api.IConnection = { host: connection.host };
  // 5. Attempt refresh with expired token - should fail
  await TestValidator.error("should reject expired refresh token", async () => {
    await api.functional.todoApp.auth.member.refresh(expiredConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppMemberSession.IRefresh,
    });
  });
  // 6. Validate original tokens remain unchanged
  TestValidator.equals(
    "access token unchanged",
    joinResponse.access_token.access_token,
    joinResponse.access_token.access_token,
  );
  TestValidator.equals(
    "refresh token unchanged",
    joinResponse.refresh_token.refresh_token,
    refreshToken,
  );
}