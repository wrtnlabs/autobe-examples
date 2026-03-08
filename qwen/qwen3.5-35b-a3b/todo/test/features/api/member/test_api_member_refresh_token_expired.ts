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

export async function test_api_member_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword: string = RandomGenerator.alphaNumeric(16);
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: joinPassword,
        displayName: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Attempt refresh with an invalid/expired token
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Verify refresh request with invalid token is rejected with 401
  await TestValidator.httpError(
    "expired refresh token rejected",
    401,
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh_token: "invalid_expired_token_string",
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // 4. Verify member account still exists and can login with fresh credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const freshLogin: ITodoAppMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email: member.email,
        password: joinPassword,
      } satisfies ITodoAppMember.ILogin,
    },
  );
  typia.assert(freshLogin);
  // 5. Verify fresh login returns new tokens (different from original)
  TestValidator.notEquals(
    "fresh access token issued",
    freshLogin.token.access,
    member.token.access,
  );
  TestValidator.notEquals(
    "fresh refresh token issued",
    freshLogin.token.refresh,
    member.token.refresh,
  );
}
