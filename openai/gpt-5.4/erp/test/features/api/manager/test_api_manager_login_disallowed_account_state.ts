import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_manager_login_disallowed_account_state(
  connection: api.IConnection,
): Promise<void> {
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_manager_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined account email matches input",
    joined.email,
    joinBody.email,
  );
  TestValidator.equals("joined account is active", joined.deleted_at, null);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.ILogin;
  const loggedIn = await authorize_manager_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login returns same manager id", loggedIn.id, joined.id);
  TestValidator.equals(
    "login returns same manager email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "active account remains not deleted",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "new login issues a new access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "new login issues a new refresh token",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
}
