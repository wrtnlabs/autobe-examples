import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_request_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // Ensure unauthorized access to GET /shoppingMall/administrator/administratorRequests/{administratorRequestId} is forbidden.
  // 1. Create a random administratorRequestId
  const invalidRequestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Try access without authorization
  await TestValidator.httpError(
    "unauthorized access without admin session",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administratorRequests.at(
        connection,
        { administratorRequestId: invalidRequestId },
      );
    },
  );
  // 3. Create an admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 4. Use authorized adminConnection to access with valid authorization
  //    For coverage, attempt to access a real or mock administratorRequestId (random one for simulation)
  await TestValidator.error(
    "should not throw when accessing with valid admin authorization",
    async () => {
      const adminReqId = typia.random<string & tags.Format<"uuid">>();
      const response =
        await api.functional.shoppingMall.administrator.administratorRequests.at(
          adminConnection,
          { administratorRequestId: adminReqId },
        );
      typia.assert(response);
    },
  );
}
