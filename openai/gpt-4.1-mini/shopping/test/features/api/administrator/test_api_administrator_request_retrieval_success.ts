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
import { generate_random_shopping_mall_administrator_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Create a new administrator request
  const request =
    await generate_random_shopping_mall_administrator_administrator_requests_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(request);
  // 3. Retrieve the created administrator request by its UUID
  // Assuming runtime shape includes 'id': string
  const requestId = (request as any).id as string;
  const retrieved =
    await api.functional.shoppingMall.administrator.administrator.requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(retrieved);
  // 4. Validate the retrieved request matches created request
  TestValidator.equals("full request object", retrieved, request);
}
