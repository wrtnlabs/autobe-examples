import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify that administrator refresh tokens are bound to the current session.
 *
 * This test validates the administrator authentication refresh flow by creating
 * two separate administrator identities, obtaining distinct refresh tokens, and
 * confirming that a refresh request fails when a token from one session is used
 * in the context of another session. The scenario protects the session-binding
 * rule that refresh tokens cannot be reused across accounts or unrelated login
 * sessions.
 *
 * 1. Create two independent administrator accounts and log them in separately.
 * 2. Capture the refresh token issued to each administrator session.
 * 3. Attempt to refresh administrator A's session using administrator B's refresh token.
 * 4. Assert that the refresh call is rejected and does not return a new authorized payload.
 */
export async function test_api_administrator_refresh_mismatched_session_token(
  connection: api.IConnection,
): Promise<void> {
  const administratorAConnection: api.IConnection = { host: connection.host };
  const administratorBConnection: api.IConnection = { host: connection.host };
  const administratorAPassword = typia.random<
    string & tags.Format<"password">
  >();
  const administratorBPassword = typia.random<
    string & tags.Format<"password">
  >();
  const administratorA = await authorize_administrator_join(
    administratorAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: administratorAPassword,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administratorA);
  const administratorB = await authorize_administrator_join(
    administratorBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: administratorBPassword,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administratorB);
  const administratorALoginConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorBLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorALoggedIn = await authorize_administrator_login(
    administratorALoginConnection,
    {
      body: {
        email: administratorA.email,
        password: administratorAPassword,
      } satisfies IMallPlatformAdministrator.ILogin,
    },
  );
  typia.assert(administratorALoggedIn);
  const administratorBLoggedIn = await authorize_administrator_login(
    administratorBLoginConnection,
    {
      body: {
        email: administratorB.email,
        password: administratorBPassword,
      } satisfies IMallPlatformAdministrator.ILogin,
    },
  );
  typia.assert(administratorBLoggedIn);
  await TestValidator.error(
    "administrator refresh should reject a mismatched session token",
    async () => {
      await authorize_administrator_refresh(administratorALoginConnection, {
        body: {
          refreshToken: administratorBLoggedIn.token.refresh,
        } satisfies IMallPlatformAdministrator.IRefresh,
      });
    },
  );
}
