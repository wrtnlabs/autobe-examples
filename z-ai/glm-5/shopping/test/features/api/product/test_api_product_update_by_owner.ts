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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test the successful update of a product by its owner seller.
 *
 * This test validates that a seller can successfully update their own product
 * with new name, description, and base price while maintaining data integrity.
 */
export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection for authentication isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as seller
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create a product to update
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Store original values for comparison
  const originalCreatedAt = product.created_at;
  const originalId = product.id;
  const originalCategoryId = product.category.id;
  // 4. Prepare update data with unique name
  const newName = `Updated ${RandomGenerator.name()} ${Date.now()}`;
  const updateData = {
    name: newName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    base_price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallProduct.IUpdate;
  // 5. Send PUT request to update the product
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: updateData,
    });
  typia.assert(updatedProduct);
  // 6. Validate product ID remains unchanged
  TestValidator.equals("product id unchanged", updatedProduct.id, originalId);
  // 7. Validate seller ownership is preserved
  TestValidator.equals(
    "seller id preserved",
    updatedProduct.seller.id,
    seller.id,
  );
  // 8. Validate updated_at is later than or equal to created_at
  // Note: Using >= as updates in same second are possible
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedProduct.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  // 9. Validate updated fields match the request
  TestValidator.equals("name updated", updatedProduct.name, updateData.name!);
  TestValidator.equals(
    "description updated",
    updatedProduct.description,
    updateData.description!,
  );
  TestValidator.equals(
    "base_price updated",
    updatedProduct.base_price,
    updateData.base_price!,
  );
  // 10. Validate category is preserved when not changed
  TestValidator.equals(
    "category preserved",
    updatedProduct.category.id,
    originalCategoryId,
  );
}
