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

export async function test_api_administrator_refresh_status_changed_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdministrator.IJoin;
  const authorized = await authorize_administrator_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined administrator email matches",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "joined administrator is not banned",
    authorized.banned,
    false,
  );
  TestValidator.equals(
    "joined administrator is not deleted",
    authorized.deleted_at,
    null,
  );
  const refreshConnection: api.IConnection = { host: connection.host };
  const tamperedRefresh = `${authorized.token.refresh}-${RandomGenerator.alphabets(8)}`;
  await TestValidator.error("tampered refresh token is rejected", async () => {
    await authorize_administrator_refresh(refreshConnection, {
      body: {
        refresh: tamperedRefresh,
      } satisfies IShoppingMallAdministrator.IRefresh,
    });
  });
}
