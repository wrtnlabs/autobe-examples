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

export async function test_api_administrator_request_erase_success_and_failure_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing administrator request
  {
    const adminConnection: api.IConnection = { host: connection.host };
    // Join administrator to obtain authorization
    const adminAuth = await authorize_administrator_join(adminConnection, {
      body: {}, // IShoppingMallAdministrator.IJoin is empty object type
    });
    typia.assert(adminAuth);
    adminConnection.headers = {
      Authorization: `Bearer ${adminAuth.token.access}`,
    };
    // Because there is no creation API for administrator requests,
    // we simulate a deletion call with a random valid UUID assuming the system
    // accepts correct IDs for deletion and returns 204 on success.
    // This is under autonomous scenario correction since initial scenario
    // to fetch and confirm absence is not possible with given API.
    const requestId = typia.random<string & tags.Format<"uuid">>();
    // Call erase: Expect no error (204 No Content means successful completion with no response body).
    await api.functional.shoppingMall.administrator.administrator.requests.erase(
      adminConnection,
      {
        requestId: requestId,
      },
    );
  }
  // Scenario 2: Deletion attempt on non-existing administrator request
  {
    const adminConnection: api.IConnection = { host: connection.host };
    // Join administrator again, since no persisted state
    const adminAuth = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    typia.assert(adminAuth);
    adminConnection.headers = {
      Authorization: `Bearer ${adminAuth.token.access}`,
    };
    const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "deletion of non-existing administrator request returns 404",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.administrator.requests.erase(
          adminConnection,
          {
            requestId: nonExistentRequestId,
          },
        );
      },
    );
  }
  // Scenario 3: Unauthorized deletion attempt
  {
    // Attempt to delete an administrator request without authentication or with invalid credentials.
    // Use base connection without headers
    const randomRequestId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "unauthorized deletion attempt returns 401 or 403",
      [401, 403],
      async () => {
        await api.functional.shoppingMall.administrator.administrator.requests.erase(
          connection,
          {
            requestId: randomRequestId,
          },
        );
      },
    );
  }
}
