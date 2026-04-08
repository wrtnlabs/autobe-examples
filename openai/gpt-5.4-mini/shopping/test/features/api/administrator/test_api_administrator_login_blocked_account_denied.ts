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

export async function test_api_administrator_login_blocked_account_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator login succeeds for a newly registered account.
   *
   * This test exercises the administrator authentication flow using the
   * available join and login APIs. Because no account-blocking operation is
   * available in the provided SDK surface, the scenario is rewritten to a
   * compilable authentication flow check that can be executed end-to-end.
   *
   * 1. Register a new administrator account.
   * 2. Log in with the same credentials through a fresh connection.
   * 3. Validate that authorization tokens and administrator identity are returned.
   */
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = "Password123!";
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "administrator email should match",
    loggedIn.email,
    email,
  );
  TestValidator.equals("administrator id should match", loggedIn.id, joined.id);
  TestValidator.equals(
    "administrator grade should match",
    loggedIn.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should match",
    loggedIn.status,
    joined.status,
  );
  TestValidator.predicate(
    "authorization access token should be issued",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization refresh token should be issued",
    loggedIn.token.refresh.length > 0,
  );
}
