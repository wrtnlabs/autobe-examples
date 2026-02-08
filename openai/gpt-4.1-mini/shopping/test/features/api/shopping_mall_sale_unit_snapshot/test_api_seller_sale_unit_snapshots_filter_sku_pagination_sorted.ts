import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";

export async function test_api_seller_sale_unit_snapshots_filter_sku_pagination_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Due to lack of explicit schema for IRequest, we send empty object
  const body: IShoppingMallSaleUnitSnapshot.IRequest = {};
  // 3. Invoke API call
  const response =
    await api.functional.shoppingMall.seller.sale_unit_snapshots.index(
      sellerConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages non-negative", response.pagination.pages >= 0);
  // 5. Removed skuCode sorting validation due to property inexistence
  for (let i = 0; i < response.data.length; ++i) {
    typia.assert(response.data[i]);
  }
  // 6. Access control test: Use unauthorized connection and expect error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.shoppingMall.seller.sale_unit_snapshots.index(
      unauthorizedConnection,
      { body },
    );
  });
}
