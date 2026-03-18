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

export async function test_api_administrator_account_deleted_record_lookup(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const output =
    await api.functional.shoppingMall.administrator.administrators.at(
      adminConnection,
      {
        administratorId: joined.id,
      },
    );
  typia.assert(output);
  TestValidator.equals("administrator id", output.id, joined.id);
  TestValidator.equals("administrator email", output.email, joined.email);
  TestValidator.equals("administrator grade", output.grade, joined.grade);
  TestValidator.equals(
    "administrator account status",
    output.accountStatus,
    joined.accountStatus,
  );
  TestValidator.equals(
    "administrator createdAt",
    output.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "administrator updatedAt",
    output.updatedAt,
    joined.updatedAt,
  );
  TestValidator.equals(
    "administrator deletedAt",
    output.deletedAt,
    joined.deletedAt,
  );
}
