import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sales_index_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Call sales index API with no result expected
  const body = {} satisfies IShoppingMallSale.IRequest;
  const result = await api.functional.shoppingMall.seller.sales.index(
    sellerConnection,
    {
      body,
    },
  );
  typia.assert(result);
  TestValidator.equals("empty data array", result.data.length, 0);
  TestValidator.equals("records count", result.pagination.records, 0);
  TestValidator.equals("pages count", result.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current >= 0",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    result.pagination.limit >= 0,
  );
}
