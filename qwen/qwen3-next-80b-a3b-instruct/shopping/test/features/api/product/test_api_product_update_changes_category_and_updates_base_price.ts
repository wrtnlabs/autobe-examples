import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_update_changes_category_and_updates_base_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate a random product ID and category ID (assume they exist)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const newCategoryId = typia.random<string & tags.Format<"uuid">>();
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100>
  >();
  const updatedPrice = initialPrice + 1000;
  // 3. Update product with new category and increased base price
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId,
      body: {
        category_id: newCategoryId,
        base_price: updatedPrice,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(updatedProduct);
  // 4. Validate updates
  TestValidator.equals(
    "category updated",
    updatedProduct.category.id,
    newCategoryId,
  );
  TestValidator.equals(
    "base price updated",
    updatedProduct.base_price,
    updatedPrice,
  );
}
