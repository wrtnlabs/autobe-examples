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

export async function test_api_administrator_sale_view_stats_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This edge case test evaluates the behavior when requesting sale view statistics using a UUID 'viewStatId' that does not exist in the database.
  // It verifies the system returns a 404 Not Found status, correctly handling the error case without exposing sensitive information.
  // It ensures the administrator authorization is properly required and enforced before the request is made.
  // 1. Administrator join (register)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty type
  });
  typia.assert(adminAuth);
  // 2. Use authorized connection
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Use a guaranteed non-existent UUID for viewStatId
  const viewStatId = "00000000-0000-0000-0000-000000000000";
  // 4. Request sale view stat by non-existent viewStatId and expect a 404 error
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent sale view stat",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_view_stats.at(
        adminConnection,
        {
          viewStatId,
        },
      );
    },
  );
}
