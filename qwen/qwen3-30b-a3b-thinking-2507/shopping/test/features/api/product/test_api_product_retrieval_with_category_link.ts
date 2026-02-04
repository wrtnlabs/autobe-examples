import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_retrieval_with_category_link(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product category
  const category = await api.functional.shoppingMall.seller.categories.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallProductCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Retrieve a product by ID to verify category information
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.products.at(connection, {
    productId,
  });
  typia.assert(product);
  // 4. Validate product has category information
  if (product.category === undefined) {
    throw new Error("Product category is undefined");
  }
  // 5. Validate category name and ID match the category we created
  TestValidator.equals(
    "product category name should match",
    product.category.name,
    category.name,
  );
  TestValidator.equals(
    "product category ID should match",
    product.category.id,
    category.id,
  );
  // 6. Validate category is active (if applicable)
  TestValidator.equals(
    "category should be active",
    product.category.active,
    true,
  );
}
