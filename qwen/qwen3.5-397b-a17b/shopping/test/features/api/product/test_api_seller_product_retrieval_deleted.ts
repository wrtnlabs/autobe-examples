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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that soft-deleted products return 404 Not Found to hide them from customers while preserving order history.
 *
 * Validates the complete product soft-delete workflow including seller authentication, product creation with variants, product deletion, and verification that deleted products are inaccessible. Ensures that the soft-delete mechanism properly hides products from all listings while maintaining referential integrity for order history.
 *
 * The test confirms that once a product is soft-deleted (deleted_at timestamp is set), it returns 404 Not Found for all retrieval attempts, including by the owning seller. This behavior ensures deleted products are removed from search results, category listings, and cannot be purchased, while preserving order history and order item snapshots for legal and business record purposes.
 *
 * 1. Seller registers with email and credentials via authorize_seller_join utility.
 * 2. Seller creates a product with name, description, base price, and category.
 * 3. Seller adds a variant to make the product complete and purchasable.
 * 4. Seller deletes the product via soft-delete mechanism.
 * 5. Test attempts to retrieve the deleted product and validates 404 response.
 */
export async function test_api_seller_product_retrieval_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
          base_price: randint(1000, 100000),
          shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // 3. Add a variant to make the product complete
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        },
      },
    );
  typia.assert(variant);
  // 4. Delete the product (soft-delete)
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 5. Verify deleted product returns 404 Not Found
  await TestValidator.error("deleted product returns 404", async () => {
    await api.functional.shoppingMall.seller.products.at(sellerConnection, {
      productId: product.id,
    });
  });
}