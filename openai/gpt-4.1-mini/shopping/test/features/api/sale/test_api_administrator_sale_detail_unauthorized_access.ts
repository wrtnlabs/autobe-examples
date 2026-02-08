import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_detail_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection to use for unauthorized access (no auth)
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID as saleId for testing access
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch sale detail without authorization
  await TestValidator.httpError(
    "unauthorized access to sale detail should be denied",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sales.at(baseConnection, {
        saleId,
      });
    },
  );
}
