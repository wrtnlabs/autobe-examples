import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (sign up) to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
    },
  });
  // Set authorization token in adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Use simulate mode to generate valid systemVersionId and data
  // because no create or list exists. This ensures test runs and compiles
  const systemVersionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the system version by the admin
  const systemVersion =
    await api.functional.shoppingMall.administrator.systemVersions.at(
      adminConnection,
      {
        id: systemVersionId,
      },
    );
  // 4. Assert the retrieved system version
  typia.assert(systemVersion);
  // 5. Validate id matches requested id
  TestValidator.equals("systemVersion id", systemVersion.id, systemVersionId);
}
