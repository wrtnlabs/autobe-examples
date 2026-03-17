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

export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const email = `admin.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const body = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://example.com/admin/join/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallAdministrator.IJoin;
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "joined email matches input",
    authorized.email,
    body.email,
  );
  TestValidator.equals("administrator is not banned", authorized.banned, false);
  TestValidator.equals(
    "administrator is not deleted",
    authorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "connection authorization header updated",
    administratorConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(authorized.updated_at).getTime() >=
      new Date(authorized.created_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is not earlier than expired_at",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
