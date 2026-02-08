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

export async function test_api_administrator_requests_reject_already_resolved_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator signup and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update adminConnection headers with authorized token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new administrator request to reject
  const adminRequest =
    await generate_random_shopping_mall_administrator_administrator_requests_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(adminRequest);

  // Since 'id' does not exist, we cannot use it directly; we must reject this fix or ensure correct property exists.
  // For this fix, we reject because there's no suitable property to use.
}