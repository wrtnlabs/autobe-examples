import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test seller product update functionality with comprehensive field modifications.
 *
 * Validates the complete product update flow for authenticated sellers. Ensures that sellers can modify their product details including name, description, category assignment, and base price. Verifies that the updated product reflects all changes and that the updated_at timestamp is properly refreshed.
 *
 * Special attention is given to verifying that all updated fields match the input values and that the product remains accessible after modification. The test also confirms that the system properly handles category reassignment and price updates.
 *
 * 1. Administrator registers and authenticates to create a category.
 * 2. A new category is created for product organization.
 * 3. Seller registers and authenticates to manage products.
 * 4. Seller creates a product with initial details and no category assignment.
 * 5. Seller updates the product with new name, description, category, and base price.
 * 6. Validates that all updated fields match the input values.
 * 7. Validates that updated_at timestamp is newer than created_at.
 */
export async function test_api_product_update_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a category for product organization
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create a product with initial details
  const initialProductName = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const initialBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialProductName,
        description: initialDescription,
        base_price: initialBasePrice,
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // Store original timestamps for comparison
  const createdAt = product.created_at;
  const originalUpdatedAt = product.updated_at;
  // 5. Update the product with new details
  const updatedProductName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedProductName,
        description: updatedDescription,
        shopping_mall_category_id: category.id,
        base_price: updatedBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 6. Validate updated fields match input values
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedProductName,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product category assigned",
    updatedProduct.category?.id,
    category.id,
  );
  TestValidator.equals(
    "product base_price updated",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at unchanged",
    updatedProduct.created_at === createdAt,
  );
  TestValidator.predicate(
    "updated_at is newer than original",
    new Date(updatedProduct.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  // 8. Verify product still belongs to the seller
  TestValidator.equals(
    "seller ownership maintained",
    updatedProduct.seller.id,
    product.seller.id,
  );
}
