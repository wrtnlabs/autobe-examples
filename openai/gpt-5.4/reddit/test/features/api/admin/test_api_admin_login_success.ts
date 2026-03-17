import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const joined = await authorize_admin_join(joinConnection, {
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
  } satisfies ICommunityPlatformAdmin.ILogin;
  const loggedIn = await authorize_admin_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals("same admin id after login", loggedIn.id, joined.id);
  TestValidator.equals(
    "same admin email after login",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "same admin status after login",
    loggedIn.status,
    joined.status,
  );
  TestValidator.equals(
    "same created_at after login",
    loggedIn.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "same deleted_at after login",
    loggedIn.deleted_at,
    joined.deleted_at,
  );
  TestValidator.equals(
    "same email verification state after login",
    loggedIn.email_verified_at,
    joined.email_verified_at,
  );
  TestValidator.notEquals(
    "fresh access token on login",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "fresh refresh token on login",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "login connection is authenticated",
    typeof loginConnection.headers?.Authorization === "string" &&
      loginConnection.headers.Authorization.length > 0,
  );
  TestValidator.equals(
    "login connection authorization matches access token",
    loginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
  if (joined.last_signed_in_at === null) {
    TestValidator.predicate(
      "last_signed_in_at populated after login",
      loggedIn.last_signed_in_at !== null,
    );
  } else {
    TestValidator.predicate(
      "last_signed_in_at not earlier after login",
      loggedIn.last_signed_in_at !== null &&
        new Date(loggedIn.last_signed_in_at).getTime() >=
          new Date(joined.last_signed_in_at).getTime(),
    );
  }
}
