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

export async function test_api_administrator_system_version_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to update a system version record with a non-existent id parameter
  // Expect not found error response indicating the record does not exist
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & tags.Format<"email">>()}`,
      password: "password1234",
    },
  });
  // Update adminConnection headers with token for authorization
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare a non-existent UUID for the system version id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body with minimal required fields
  const updateBody: IShoppingMallSystemVersion.IUpdate = {
    change_description: "Attempting update on non-existent system version",
    changed_by: adminAuth.email,
  };
  // 4. Attempt to update and expect an HTTP 404 Not Found error
  await TestValidator.httpError(
    "update non-existent system version should throw 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.update(
        adminConnection,
        {
          id: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
