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

export async function test_api_administrator_account_access_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // Attempt to access administrator details endpoint without valid authentication token.
  // Expect access denied with HTTP 401 or 403 error.
  // Create a connection without authentication headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Use a random UUID for administratorId (simulate arbitrary admin access attempt)
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  // Expect HTTP error 401 Unauthorized or 403 Forbidden
  await TestValidator.httpError(
    "administrator account access without authentication",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrators.at(
        unauthenticatedConnection,
        {
          administratorId: administratorId,
        },
      );
    },
  );
}
