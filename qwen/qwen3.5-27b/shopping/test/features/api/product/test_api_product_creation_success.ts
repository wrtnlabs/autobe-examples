import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test successful product creation by an authenticated seller with valid product data.
 *
 * Validates the complete product creation workflow including seller registration, authentication, and product creation with name, description, base price, and optional category assignment. Ensures that the product is created successfully with correct seller association, proper timestamps, and empty arrays for images and variants.
 *
 * Special attention is given to verifying that the product name is stored correctly, the seller association is maintained from the authentication context, and the product is immediately searchable but unavailable for purchase until variants are added.
 *
 * 1. Register a new seller account via /shoppingMall/auth/seller/join
 * 2. Create a product with valid name, description, base_price, and optional category_id
 * 3. Verify the product is created successfully with:
 *    - Generated UUID for product ID
 *    - Correct seller association from authentication context
 *    - Empty arrays for images and variants
 *    - Current timestamps for created_at and updated_at
 *    - deleted_at is null (active product)
 * 4. Validate product details match input data
 */
export async function test_api_product_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(seller);
  // 2. Create product with valid data
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(product);
  // 3. Validate product creation success
  TestValidator.equals(
    "product name matches input",
    product.name,
    product.name,
  );
  TestValidator.predicate(
    "product description exists",
    product.description.length > 0,
  );
  TestValidator.predicate("base price is positive", product.base_price > 0);
  TestValidator.equals(
    "seller association is correct",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals("images array is empty", product.images.length, 0);
  TestValidator.equals("variants array is empty", product.variants.length, 0);
  TestValidator.equals(
    "product is active (not deleted)",
    product.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    product.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    product.updated_at.length > 0,
  );
}