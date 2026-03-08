import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator attempting to retrieve a non-existent administrator request.
 *
 * This test validates that the system properly returns a 404 error when
 * attempting to access an administrator request that does not exist.
 *
 * **Test Flow:**
 * 1. Create an administrator account
 * 2. Attempt to retrieve a request with a non-existent UUID
 * 3. Expect HTTP 404 Not Found error
 */
export async function test_api_administrator_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a non-existent UUID for request ID
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent request - expect 404
  await TestValidator.httpError(
    "non-existent request should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.requests.at(
        adminConnection,
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
}
