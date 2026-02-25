import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_setting_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // No admin login, directly attempt to update
  const body: IShoppingMallSystemSetting.IUpdate = {
    key: "some_setting_key",
    value: "new_value",
    description: "Updated description",
    data_type: "string",
  };
  const id = typia.random<string & tags.Format<"uuid">>();
  // Using base connection without authorization
  await TestValidator.httpError(
    "unauthorized update attempt should fail",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemSettings.update(
        connection,
        {
          id,
          body,
        },
      );
    },
  );
}
