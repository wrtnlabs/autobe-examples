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

export async function test_api_administrator_account_detail_lookup(
  connection: api.IConnection,
): Promise<void> {
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdministrator.IJoin;
  const authorized = await authorize_administrator_join(
    { host: connection.host },
    {
      body: joinBody,
    },
  );
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const detail =
    await api.functional.shoppingMall.administrator.administrators.at(
      adminConnection,
      {
        administratorId: authorized.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("administrator id", detail.id, authorized.id);
  TestValidator.equals("administrator email", detail.email, authorized.email);
  TestValidator.equals("administrator grade", detail.grade, authorized.grade);
  TestValidator.equals(
    "administrator account status",
    detail.accountStatus,
    authorized.accountStatus,
  );
  TestValidator.equals(
    "administrator created at",
    detail.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "administrator updated at",
    detail.updatedAt,
    authorized.updatedAt,
  );
  TestValidator.equals(
    "administrator deleted at",
    detail.deletedAt,
    authorized.deletedAt,
  );
  await TestValidator.httpError(
    "administrator detail lookup should fail for missing record",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.at(
        adminConnection,
        {
          administratorId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
