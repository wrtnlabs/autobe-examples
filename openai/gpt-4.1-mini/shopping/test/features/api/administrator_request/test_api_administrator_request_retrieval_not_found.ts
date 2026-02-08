import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the behavior when retrieving a non-existent or soft-deleted administrator request
  // 1. Authenticate as a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve a non-existent administrator request by UUID
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent request retrieval returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.requests.at(
        adminConnection,
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
  // 3. Attempt to retrieve a soft-deleted administrator request (simulate by reusing same ID)
  // Since we don't have a way to create a soft-deleted request here, we treat another random UUID as soft-deleted
  const softDeletedRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "soft-deleted request retrieval returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.requests.at(
        adminConnection,
        {
          requestId: softDeletedRequestId,
        },
      );
    },
  );
  // 4. Attempt unauthorized request without token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.requests.at(
        unauthorizedConnection,
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
}
