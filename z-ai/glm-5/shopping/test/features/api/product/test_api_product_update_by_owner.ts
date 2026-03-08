import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that an approved seller can successfully update their own product information.
 *
 * This test validates the product update workflow where:
 * 1. A seller creates and owns a product
 * 2. The seller updates the product's name, description, price, and category
 * 3. The system creates a snapshot of the previous state
 * 4. The updated product reflects all changes while maintaining seller ownership
 */
export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Setup: Create administrator for category management
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Setup: Create categories for product assignment
  const category1 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category1);
  const category2 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category2);
  // 4. Setup: Create initial product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category1.id,
      },
    },
  );
  typia.assert(product);
  // Store original values for comparison
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  const originalCategoryId = product.category.id;
  const originalCreatedAt = product.created_at;
  const sellerId = product.seller.id;
  // 5. Execute: Update the product with new values
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const newCategoryId = category2.id;
  const updateBody = {
    name: newName,
    description: newDescription,
    base_price: newBasePrice,
    shopping_mall_category_id: newCategoryId,
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 6. Validate: Check all updated values
  TestValidator.equals("product name updated", updatedProduct.name, newName);
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "product base_price updated",
    updatedProduct.base_price,
    newBasePrice,
  );
  TestValidator.equals(
    "product category updated",
    updatedProduct.category.id,
    newCategoryId,
  );
  // 7. Validate: Seller ownership remains unchanged
  TestValidator.equals(
    "seller ownership unchanged",
    updatedProduct.seller.id,
    sellerId,
  );
  // 8. Validate: Timestamps are properly updated
  TestValidator.equals(
    "created_at unchanged",
    updatedProduct.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedProduct.updated_at) > new Date(originalCreatedAt),
  );
}
