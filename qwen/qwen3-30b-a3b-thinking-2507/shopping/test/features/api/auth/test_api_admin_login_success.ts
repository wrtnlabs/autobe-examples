import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
) {
  const testEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, {
      body: {} satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(joinedAdmin);
  const loginConnection: api.IConnection = { host: connection.host };
  const testPassword = "TestPassword123";
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: "https://example.com/app",
        referrer: "https://example.com/login",
        ip: "127.0.0.1",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);
  const token = loggedInAdmin.token;
  TestValidator.equals(
    "access token presence",
    token.access,
    String(typeof token.access === "string" && token.access.length > 10),
  );
  TestValidator.equals(
    "refresh token presence",
    token.refresh,
    String(typeof token.refresh === "string" && token.refresh.length > 10),
  );
  TestValidator.equals(
    "access token expiration format",
    token.expired_at,
    String(typeof token.expired_at === "string" && token.expired_at.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/)),
  );
  TestValidator.equals(
    "refresh token expiration format",
    token.refreshable_until,
    String(typeof token.refreshable_until === "string" && token.refreshable_until.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/)),
  );
  TestValidator.equals(
    "admin ID presence",
    loggedInAdmin.id,
    String(typeof loggedInAdmin.id === "string" && loggedInAdmin.id.length > 0),
  );
}