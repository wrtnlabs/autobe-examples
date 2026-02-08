import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_list_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets authorized
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Call the product listing API with empty body for basic pagination
  const body: IShoppingMallProduct.IRequest = {};
  const productsPage = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    { body },
  );
  // 3. Assert entire response structure
  typia.assert(productsPage);
  // 4. Validate pagination metadata
  const { pagination, data } = productsPage;
  TestValidator.predicate("pagination current number", pagination.current >= 0);
  TestValidator.predicate("pagination limit number", pagination.limit >= 0);
  TestValidator.predicate("pagination records number", pagination.records >= 0);
  TestValidator.predicate("pagination pages number", pagination.pages >= 0);
  // 5. Validate data array is array of product summary - no properties can be checked due to empty DTO
  TestValidator.predicate("data is array", Array.isArray(data));
  // 6. No direct validation of deleted product exclusion or sorting by created_at possible due to lack of properties
  // Just confirm count aligns consistently if pages>0
  if (pagination.pages > 0 && pagination.current <= pagination.pages) {
    TestValidator.predicate(
      "data count valid",
      data.length > 0 && data.length <= pagination.limit,
    );
  }
}
