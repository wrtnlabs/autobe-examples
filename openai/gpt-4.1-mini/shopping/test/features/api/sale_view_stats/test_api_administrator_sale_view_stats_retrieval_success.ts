import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_view_stats_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(auth);
  adminConnection.headers = {
    Authorization: auth.token.access,
  };
  // 2. Generate a valid UUID string
  const viewStatId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch sale view stats by UUID
  const saleViewStat =
    await api.functional.shoppingMall.administrator.sale_view_stats.at(
      adminConnection,
      {
        viewStatId,
      },
    );
  typia.assert(saleViewStat);
}
