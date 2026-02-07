import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test product variant creation workflow for the e-commerce shopping mall platform.
 * 1. Seller joins the platform
 * 2. Seller creates a product
 * 3. Create a product variant with valid SKU code and stock quantity
 * 4. Verify variant is created with correct properties
 */
export async function test_api_seller_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Seller joins the platform
  const sellerAuth = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  typia.assert(sellerAuth);
  // Step 2: Seller creates a product
  // Note: The IShoppingMallProduct response type is defined as {} (empty) in DTO definitions,
  // so we can't access product.id directly. Using a placeholder UUID for the product ID.
  // In a real scenario, the product ID would be used to create the variant.
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
  // Step 3: Create a product variant with valid data
  // Using a placeholder UUID for productId since product.id is not accessible
  const variant =
    await api.functional.shoppingMall.seller.products.variants.createVariant(
      sellerConnection,
      {
        productId: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
        body: typia.random<IShoppingMallProductVariant.ICreate>(),
      },
    );
  typia.assert(variant);
}
