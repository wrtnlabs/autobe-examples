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

export async function test_api_shopping_mall_administrator_system_settings_summary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorizedAdmin);
  // Set authorization header on adminConnection for subsequent requests
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Attempt to get the system settings summary as authorized administrator
  const systemSettingsSummary =
    await api.functional.shoppingMall.administrator.systemSettings.summary.at(
      adminConnection,
    );
  typia.assert(systemSettingsSummary);
  // 3. Validate the presence of mandatory properties in the result
  //    All properties are required in IShoppingMallSystemSetting.ISummary except description which is optional (null or string)
  TestValidator.predicate(
    "systemSettingsSummary has id",
    typeof systemSettingsSummary.id === "string" &&
      systemSettingsSummary.id.length > 0,
  );
  TestValidator.predicate(
    "systemSettingsSummary has key",
    typeof systemSettingsSummary.key === "string" &&
      systemSettingsSummary.key.length > 0,
  );
  TestValidator.predicate(
    "systemSettingsSummary has value",
    typeof systemSettingsSummary.value === "string",
  );
  TestValidator.predicate(
    "systemSettingsSummary dataType is string",
    typeof systemSettingsSummary.dataType === "string" &&
      systemSettingsSummary.dataType.length > 0,
  );
  // description can be string|null|undefined
  TestValidator.predicate(
    "systemSettingsSummary description nullable or undefined",
    systemSettingsSummary.description === null ||
      typeof systemSettingsSummary.description === "string" ||
      systemSettingsSummary.description === undefined,
  );
  // 4. Test unauthorized access: Use a fresh connection without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to system settings summary",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemSettings.summary.at(
        unauthorizedConnection,
      );
    },
  );
}
