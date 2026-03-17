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

export async function test_api_super_administrator_join_email_duplicated(
  connection: api.IConnection,
): Promise<void> {
  const primaryConnection: api.IConnection = { host: connection.host };
  const duplicateConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const secondPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const firstJoin = {
    email,
    password: firstPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const authorized: IShoppingMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(primaryConnection, {
      body: firstJoin,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "registered email matches input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "super administrator is active",
    authorized.active,
    true,
  );
  TestValidator.equals(
    "super administrator is not deleted",
    authorized.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "access and refresh tokens are distinct",
    authorized.token.access,
    authorized.token.refresh,
  );
  const secondJoin = {
    email,
    password: secondPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  await TestValidator.error(
    "duplicate super administrator email registration must be rejected",
    async () => {
      await authorize_super_administrator_join(duplicateConnection, {
        body: secondJoin,
      });
    },
  );
  TestValidator.equals(
    "original authorized identity remains tied to the duplicated email",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "original authorized identity remains active after duplicate rejection",
    authorized.active,
    true,
  );
  TestValidator.equals(
    "original authorized identity remains the only observed account state",
    authorized.deleted_at,
    null,
  );
}
