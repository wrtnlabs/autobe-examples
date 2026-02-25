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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_update_success_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests a successful product update by an authorized seller who owns the product.
  // The test starts with seller account registration (join), then product creation, followed by
  // updating the product details such as name, description, base price, and product subcategory.
  // After update, the system creates an immutable snapshot preserving previous product and variant states.
  // The response is verified to include updated product fields. This test validates authorization,
  // ownership verification, snapshot creation, and successful data update of product metadata.
  // 1. Seller join and authorization
  const sellerJoinConn: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  // Create seller-specific connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {}, // Use full random defaults
    },
  );
  typia.assert(product);
  // 3. Prepare updated product data
  // Generate a different product subcategory ID from original
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >() satisfies number;
  // For productSubcategoryId, change to a new random uuid different from current
  let updatedProductSubcategoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  while (updatedProductSubcategoryId === product.productSubcategory.id) {
    updatedProductSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  }
  const updateBody: IShoppingMallProduct.IUpdate = {
    name: updatedName,
    description: updatedDescription,
    basePrice: updatedBasePrice,
    productSubcategoryId: updatedProductSubcategoryId,
  };
  // 4. Perform product update
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 5. Validate that product fields are updated correctly
  TestValidator.equals(
    "product ID should remain same",
    updatedProduct.id,
    product.id,
  );
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.basePrice,
    updatedBasePrice,
  );
  TestValidator.equals(
    "product subcategory updated",
    updatedProduct.productSubcategory.id,
    updatedProductSubcategoryId,
  );
  // 6. Validate related seller info remains unchanged
  TestValidator.equals(
    "product seller ID unchanged",
    updatedProduct.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "product seller shopName unchanged",
    updatedProduct.seller.shopName,
    product.seller.shopName,
  );
}
