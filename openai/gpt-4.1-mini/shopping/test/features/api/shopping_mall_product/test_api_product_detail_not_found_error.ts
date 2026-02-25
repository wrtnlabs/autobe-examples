import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_detail_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that requesting a non-existent product via seller endpoint returns a 404 error without leaking any product data. This includes the authentication prerequisite: a valid seller account must exist and be authorized before the product detail call.
  // 1. Setup seller join and authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Use a randomly generated UUID as invalid productId that does not exist
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Try to retrieve product detail with invalid productId
  await TestValidator.httpError("product detail not found", 404, async () => {
    await api.functional.shoppingMall.seller.products.at(sellerConnection, {
      productId: invalidProductId,
    });
  });
}
