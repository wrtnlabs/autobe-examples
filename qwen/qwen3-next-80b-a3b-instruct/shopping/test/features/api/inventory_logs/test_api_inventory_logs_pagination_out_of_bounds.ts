import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_logs_pagination_out_of_bounds(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller to access inventory logs
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Query inventory logs with out-of-bounds pagination parameters
  const response =
    await api.functional.shoppingMall.seller.inventory_logs.index(
      sellerConnection,
      {
        body: {
          page: 999 as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallInventoryLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination response for out-of-bounds page
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
