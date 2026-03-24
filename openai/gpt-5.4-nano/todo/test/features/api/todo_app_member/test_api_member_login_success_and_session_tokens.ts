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

export async function test_api_member_login_success_and_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  const testStart = new Date();
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const hrefJoin = "https://example.com/members/join" satisfies string &
    tags.Format<"uri">;
  const referrerJoin = "https://example.com/referrer/join" satisfies string &
    tags.Format<"uri">;
  const memberConnection: api.IConnection = { host: connection.host };
  const joined: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        password,
        href: hrefJoin,
        referrer: referrerJoin,
        ip,
      },
    },
  );
  typia.assert(joined);
  const loginHref = "https://example.com/members/login" satisfies string &
    tags.Format<"uri">;
  const loginReferrer = "https://example.com/referrer/login" satisfies string &
    tags.Format<"uri">;
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn: ITodoAppMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email,
        password,
        href: loginHref,
        referrer: loginReferrer,
        ip,
      } satisfies ITodoAppMember.ILogin,
    },
  );
  typia.assert(loggedIn);
  TestValidator.predicate(
    "access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  const expiredAt = new Date(loggedIn.token.expired_at);
  const refreshableUntil = new Date(loggedIn.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > testStart);
  TestValidator.predicate(
    "refreshable_until is >= expired_at",
    refreshableUntil >= expiredAt,
  );
  let failedPassword = typia.random<string & tags.Format<"password">>();
  while (failedPassword === password) {
    failedPassword = typia.random<string & tags.Format<"password">>();
  }
  const wrongLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "invalid credentials should be rejected without creating an authenticated session",
    async () => {
      await authorize_member_login(wrongLoginConnection, {
        body: {
          email,
          password: failedPassword,
          href: loginHref,
          referrer: loginReferrer,
          ip,
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
  // Re-authenticate with correct credentials to ensure system still allows valid sessions.
  const reLoginConnection: api.IConnection = { host: connection.host };
  const reLoggedIn: ITodoAppMember.IAuthorized = await authorize_member_login(
    reLoginConnection,
    {
      body: {
        email,
        password,
        href: loginHref,
        referrer: loginReferrer,
        ip,
      } satisfies ITodoAppMember.ILogin,
    },
  );
  typia.assert(reLoggedIn);
  TestValidator.predicate(
    "re-login access token is non-empty",
    reLoggedIn.token.access.length > 0,
  );
}
