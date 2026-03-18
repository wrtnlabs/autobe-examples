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

export async function test_api_admin_login_relogin_rotates_tokens(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinBody: IShoppingMallAdmin.IJoin = {
    email,
    password,
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  const loginPayload: IShoppingMallAdmin.ILogin = {
    email,
    password,
  } satisfies IShoppingMallAdmin.ILogin;
  const login1 = await authorize_admin_login(adminConnection, {
    body: loginPayload,
  });
  typia.assert(login1);
  const firstAccess = login1.token.access;
  const firstExpiredAt = login1.token.expired_at;
  const adminConnection2: api.IConnection = { host: connection.host };
  const login2 = await authorize_admin_login(adminConnection2, {
    body: loginPayload,
  });
  typia.assert(login2);
  TestValidator.equals("admin id remains consistent", login2.id, login1.id);
  TestValidator.equals(
    "admin email remains consistent",
    login2.email,
    login1.email,
  );
  TestValidator.notEquals(
    "access token should rotate",
    firstAccess,
    login2.token.access,
  );
  TestValidator.notEquals(
    "expired_at should be updated",
    firstExpiredAt,
    login2.token.expired_at,
  );
}
