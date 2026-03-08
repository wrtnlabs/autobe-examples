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

export async function test_api_member_login_single_session_policy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinInput: ITodoAppMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const joinOutput: ITodoAppMember.IAuthorized = await authorize_member_join(
    connection,
    { body: joinInput },
  );
  typia.assert(joinOutput);
  const { email, password } = joinInput;
  // 2. Login from device A (first login)
  const deviceAConnection: api.IConnection = { host: connection.host };
  const loginInputA: ITodoAppMember.ILogin = {
    email,
    password,
  };
  const deviceAOutput: ITodoAppMember.IAuthorized =
    await authorize_member_login(deviceAConnection, { body: loginInputA });
  typia.assert(deviceAOutput);
  const deviceAToken: string = deviceAOutput.token.access;
  // 3. Login from device B (second login with same credentials)
  const deviceBConnection: api.IConnection = { host: connection.host };
  const loginInputB: ITodoAppMember.ILogin = {
    email,
    password,
  };
  const deviceBOutput: ITodoAppMember.IAuthorized =
    await authorize_member_login(deviceBConnection, { body: loginInputB });
  typia.assert(deviceBOutput);
  const deviceBToken: string = deviceBOutput.token.access;
  // 4. Verify device B login succeeded and returned different tokens
  TestValidator.notEquals(
    "device B should have different token",
    deviceAToken,
    deviceBToken,
  );
  // 5. Test that device A's old token is now invalid
  // Use it for a login attempt and expect it to fail
  const oldTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${deviceAToken}` },
  };
  // Try to use old token - the old session should be terminated
  // So trying to login again with the old context should either create a new
  // session (which is expected) or fail (if the token is completely invalidated)
  // The key test: after device B login, device A's token should be invalid
  // This means we cannot use deviceAOutput.token.refresh to get a new access token
  const oldRefreshToken: string = deviceAOutput.token.refresh;
  const oldRefreshConnection: api.IConnection = { host: connection.host };
  // Try to refresh using the old refresh token - should fail
  await TestValidator.error(
    "old refresh token should be invalid after new login",
    async () => {
      const refreshInput: ITodoAppMember.IRefresh = {
        refresh_token: oldRefreshToken,
      };
      const refreshResult: ITodoAppMember.IAuthorized =
        await authorize_member_refresh(oldRefreshConnection, {
          body: refreshInput,
        });
      typia.assert(refreshResult);
      // If we get here, the old token was still valid, which is wrong
    },
  );
}