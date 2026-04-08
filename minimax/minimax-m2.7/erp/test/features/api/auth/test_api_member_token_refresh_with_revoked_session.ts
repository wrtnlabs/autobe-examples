import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_with_revoked_session(
  connection: api.IConnection,
): Promise<void> {
  // Generate random credentials for test member
  const testPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IErpHrmMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: testPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(joined);
  // 2. Log in to create a session and obtain a refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn: IErpHrmMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email: joined.email,
        password: testPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(loggedIn);
  // Store the refresh token from a valid session
  const validRefreshToken: string = loggedIn.token.refresh;
  // 3. Log out to invalidate the session (logging in again with same credentials invalidates previous session)
  const logoutConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(logoutConnection, {
    body: {
      email: joined.email,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Attempt to refresh with the now-revoked refresh token
  // Should return 401 unauthorized error
  await TestValidator.httpError("refresh with revoked token", 401, async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await authorize_member_refresh(refreshConnection, {
      body: {
        refreshToken: validRefreshToken,
      } satisfies IErpHrmMember.IRefresh,
    });
  });
}
