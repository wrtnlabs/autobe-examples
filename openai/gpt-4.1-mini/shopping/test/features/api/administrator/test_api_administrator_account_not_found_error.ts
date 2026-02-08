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

export async function test_api_administrator_account_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator actor connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare a random realistic join body for admin
  const body = {
    // Since the IJoin schema is empty, we simulate minimum data using typia.random
    ...typia.random<IShoppingMallAdministrator.IJoin>(),
  };
  // Authorize administrator join to obtain valid access token in adminConnection's headers
  await authorize_administrator_join(adminConnection, { body });
  // Generate a non-existent administratorId (UUID v4 format)
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get administrator by non-existent id and expect 404 error
  await TestValidator.httpError(
    "requesting non-existent administrator account returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.at(
        adminConnection,
        {
          administratorId: nonExistentAdminId,
        },
      );
    },
  );
}
