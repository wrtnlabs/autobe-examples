import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_cart_list_maximum_pagination_limit(
  connection: api.IConnection,
) {
  const output: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.customer.carts.index(connection, {
      body: '{"page":1,"limit":100}',
    });
  typia.assert(output);
  TestValidator.equals(
    "pagination limit is respected",
    output.pagination.limit,
    100,
  );
}
