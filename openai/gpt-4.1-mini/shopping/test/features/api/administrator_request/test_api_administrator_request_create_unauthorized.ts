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

export async function test_api_administrator_request_create_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to create administrator request without authentication
  await TestValidator.httpError(
    "unauthorized administrator request creation",
    [401, 403],
    async () => {
      // Use base connection directly without auth headers
      await api.functional.shoppingMall.administrator.administrator.requests.create(
        connection,
        {
          // We must provide a body of type IShoppingMallAdministratorRequest.ICreate
          // However, schema is empty type {}, so we can pass an empty object
          body: {},
        },
      );
    },
  );
}
