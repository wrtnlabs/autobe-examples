import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_setting_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using authorization utility
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.Format<"password">
      >() satisfies string as string,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a random UUID that doesn't correspond to any existing setting
  const nonExistentSettingId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  // Attempt to retrieve non-existent system setting and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent system setting",
    404,
    async () =>
      await api.functional.ecommerce.administrator.system_settings.at(
        adminConnection,
        {
          settingId: nonExistentSettingId,
        },
      ),
  );
}
