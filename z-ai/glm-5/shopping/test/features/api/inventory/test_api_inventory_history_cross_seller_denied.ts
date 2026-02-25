import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductInventoryHistory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that a seller cannot retrieve inventory history for a variant owned by another seller.
 *
 * This authorization test validates that the inventory history API properly enforces
 * ownership validation, preventing cross-seller data access to sensitive inventory data.
 *
 * Test Flow:
 * 1. Seller A joins and creates a product with a variant and adds inventory
 * 2. Seller B joins as a different seller
 * 3. Seller B attempts to retrieve inventory history for Seller A's variant
 * 4. Verify the request returns 403 Forbidden (authorization denied)
 */
export async function test_api_inventory_history_cross_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  // ======================================
  // Step 1: Seller A Setup
  // ======================================
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      shop_name: `Seller A Shop ${RandomGenerator.alphabets(8)}`,
    },
  });
  // Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  // Seller A creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  // Seller A adds inventory to the variant (creates inventory history)
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerAConnection,
    {
      params: { variantId: variant.id },
    },
  );
  // ======================================
  // Step 2: Seller B Setup (Different Seller)
  // ======================================
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      shop_name: `Seller B Shop ${RandomGenerator.alphabets(8)}`,
    },
  });
  // ======================================
  // Step 3: Cross-Seller Access Attempt
  // ======================================
  // Seller B attempts to retrieve inventory history for Seller A's variant
  // This should be denied with 403 Forbidden
  await TestValidator.httpError(
    "cross-seller inventory history access denied",
    403,
    async () => {
      await api.functional.shoppingMall.seller.variants.inventory.histories.index(
        sellerBConnection,
        {
          variantId: variant.id,
          body: {} satisfies IShoppingMallProductInventoryHistory.IRequest,
        },
      );
    },
  );
}
