import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_atomic_authorization_issue(
  connection: api.IConnection,
): Promise<void> {
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://admin.example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdministrator.IJoin;
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "email matches join request",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "authorization header receives access token",
    administratorConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.equals(
    "administrator is not banned on join",
    authorized.banned,
    false,
  );
  TestValidator.equals(
    "administrator is not soft deleted on join",
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
  const duplicateAttemptConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "duplicate administrator join must fail atomically",
    async () => {
      await authorize_administrator_join(duplicateAttemptConnection, {
        body: joinBody,
      });
    },
  );
  TestValidator.equals(
    "failed duplicate join does not authorize retry connection",
    duplicateAttemptConnection.headers?.Authorization,
    undefined,
  );
}
