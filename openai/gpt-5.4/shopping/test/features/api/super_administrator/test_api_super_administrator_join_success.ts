import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {
    email: `super-admin-${RandomGenerator.alphabets(8)}@example.com`,
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const authorized = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body,
    },
  );
  typia.assert<IShoppingMallSuperAdministrator.IAuthorized>(authorized);
  TestValidator.equals("email matches input", authorized.email, body.email);
  TestValidator.equals("active after join", authorized.active, true);
  TestValidator.equals(
    "deleted_at is null on fresh join",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    authorized.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    authorized.token.access,
    authorized.token.refresh,
  );
  TestValidator.predicate(
    "refresh window is not earlier than access expiration",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "authorization header exists for immediate use",
    typeof superAdministratorConnection.headers?.Authorization === "string" &&
      superAdministratorConnection.headers.Authorization.length > 0,
  );
  TestValidator.equals(
    "authorization header populated for immediate use",
    superAdministratorConnection.headers?.Authorization,
    authorized.token.access,
  );
}
