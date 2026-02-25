import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_request_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Since there's no API to create administratorRequest, use a random UUID simulating an existing request ID
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  // First deletion attempt: should succeed with HTTP 204 No Content (no error thrown)
  await api.functional.shoppingMall.administrator.administratorRequests.erase(
    adminConnection,
    { administratorRequestId },
  );
  // Second deletion attempt on the same ID: expects HTTP 404 Not Found error
  await TestValidator.httpError(
    "deleting non-existent administrator request throws 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administratorRequests.erase(
        adminConnection,
        { administratorRequestId },
      );
    },
  );
}
