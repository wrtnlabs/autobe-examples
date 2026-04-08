import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller cannot access inventory records belonging to another seller's product variant.
 *
 * Validates the authorization boundary that sellers can only view their own inventory records, not those of other sellers. The test creates inventory data with one seller, then attempts unauthorized access with a different seller account.
 *
 * 1. First seller authenticates via join endpoint with random credentials.
 * 2. First seller creates a product with name, description, and base price.
 * 3. First seller creates a variant for the product with SKU code, options, and initial stock.
 * 4. First seller creates an inventory record with quantity change and reason.
 * 5. Second seller authenticates via join endpoint with different random credentials.
 * 6. Second seller attempts to retrieve the first seller's inventory record using the same record ID.
 * 7. System throws an error (403 Forbidden or 404 Not Found) to prevent unauthorized access.
 */
export async function test_api_inventory_record_access_by_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller authentication
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  // 2. First seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product);
  // 3. First seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. First seller creates an inventory record
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      seller1Connection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Second seller authentication
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  // 6. Second seller attempts to access first seller's inventory record
  await TestValidator.error(
    "unauthorized inventory record access",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.inventory.at(
        seller2Connection,
        {
          productId: product.id,
          variantId: variant.id,
          recordId: inventoryRecord.id,
        },
      );
    },
  );
}
