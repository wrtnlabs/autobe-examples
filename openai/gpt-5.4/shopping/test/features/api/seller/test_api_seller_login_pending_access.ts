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

export async function test_api_seller_login_pending_access(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const joinHref: string & tags.Format<"uri"> =
    "https://seller.example.com/join" as string & tags.Format<"uri">;
  const joinReferrer: string & tags.Format<"uri"> =
    "https://seller.example.com/start" as string & tags.Format<"uri">;
  const joined = await authorize_seller_join(joinConnection, {
    body: {
      email,
      password,
      href: joinHref,
      referrer: joinReferrer,
    },
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginHref: string & tags.Format<"uri"> =
    "https://seller.example.com/login" as string & tags.Format<"uri">;
  const loginReferrer: string & tags.Format<"uri"> =
    "https://seller.example.com/sign-in" as string & tags.Format<"uri">;
  const loginIp: string & tags.Format<"ipv4"> = "127.0.0.1" as string &
    tags.Format<"ipv4">;
  const loginBody = {
    email,
    password,
    href: loginHref,
    referrer: loginReferrer,
    ip: loginIp,
  } satisfies IShoppingMallSeller.ILogin;
  const loggedIn = await authorize_seller_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "seller id persists across login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "seller email matches registered email",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "approval status remains unchanged before approval",
    loggedIn.approval_status,
    joined.approval_status,
  );
  TestValidator.equals(
    "rejection reason remains unchanged",
    loggedIn.rejection_reason,
    joined.rejection_reason,
  );
  TestValidator.equals(
    "suspended flag remains unchanged",
    loggedIn.suspended,
    joined.suspended,
  );
  TestValidator.equals(
    "banned flag remains unchanged",
    loggedIn.banned,
    joined.banned,
  );
  TestValidator.equals(
    "created timestamp remains unchanged",
    loggedIn.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "deleted timestamp remains unchanged",
    loggedIn.deleted_at,
    joined.deleted_at,
  );
  TestValidator.notEquals(
    "new login issues a different access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "new login issues a different refresh token",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "access token is not empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(loggedIn.updated_at).getTime() >=
      new Date(loggedIn.created_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable window is not earlier than access expiry",
    new Date(loggedIn.token.refreshable_until).getTime() >=
      new Date(loggedIn.token.expired_at).getTime(),
  );
}
