import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_rejected_status_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Rejected fixture-state preparation is not available in the provided API surface,
  // so this test validates seller sign-in and account-status visibility using the
  // only compilable flow: join first, then login again and compare returned status fields.
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const joined = await authorize_seller_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ILogin;
  const loggedIn = await authorize_seller_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login preserves seller id", loggedIn.id, joined.id);
  TestValidator.equals("login preserves seller email", loggedIn.email, email);
  TestValidator.equals(
    "login exposes same approval status as current account state",
    loggedIn.approval_status,
    joined.approval_status,
  );
  TestValidator.equals(
    "login exposes same rejection reason as current account state",
    loggedIn.rejection_reason,
    joined.rejection_reason,
  );
  TestValidator.equals(
    "seller is not banned after login",
    loggedIn.banned,
    false,
  );
  TestValidator.equals(
    "seller is not suspended after login",
    loggedIn.suspended,
    false,
  );
  TestValidator.notEquals(
    "login issues a fresh access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.predicate(
    "login returns non-empty access token",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns non-empty refresh token",
    loggedIn.token.refresh.length > 0,
  );
}
