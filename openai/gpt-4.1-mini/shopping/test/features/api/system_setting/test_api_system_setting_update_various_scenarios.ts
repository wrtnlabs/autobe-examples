import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_setting_update_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection and authorize join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  // Set Authorization header manually from token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Scenario 1: Successful update with empty body as per schema
  {
    const validId = typia.random<string & tags.Format<"uuid">>();
    const updateBody = {} as IShoppingMallSystemSetting.IUpdate;
    const updatedSetting =
      await api.functional.shoppingMall.systemSettings.update(adminConnection, {
        id: validId,
        body: updateBody,
      });
    typia.assert(updatedSetting);
  }
  // Scenario 2: Update with non-existent ID - expect 404 error
  {
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    const updateBody = {} as IShoppingMallSystemSetting.IUpdate;
    await TestValidator.httpError(
      "update non-existent ID returns 404",
      404,
      async () => {
        await api.functional.shoppingMall.systemSettings.update(
          adminConnection,
          {
            id: nonExistentId,
            body: updateBody,
          },
        );
      },
    );
  }
}
