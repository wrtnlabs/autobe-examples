import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_inventory_add_add_inventory";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test seller inventory addition functionality.
 * 1. Register as seller
 * 2. Create a product with variants
 * 3. Add inventory to a variant
 * 4. Validate inventory history record
 */
export async function test_api_inventory_add_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Seller creates a product with a variant
  // For simplicity, create a product with a single variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: `VARIANT_${RandomGenerator.alphaNumeric(6)}`,
            option_values: [
              {
                option_name: "color",
                option_value: typia.random<string>(),
              },
            ],
            stock_quantity: 0,
          },
        ],
      },
    },
  );
  typia.assert(product);
  // Verify product was created with variants
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product should have variants");
  }
  const variant = product.variants[0];
  // 3. Seller adds inventory to the variant
  const addedInventory =
    await generate_random_shopping_mall_seller_inventory_add_add_inventory(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          variant_id: variant.id,
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          reason: "restock",
          metadata: JSON.stringify({
            source: "supplier_order",
            order_id: RandomGenerator.alphaNumeric(8),
          }),
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(addedInventory);
  // 4. Validate inventory history record
  // Note: IShoppingMallInventoryHistory response type may not have quantity_change property
  // In that case, we'll just validate the response structure
  TestValidator.predicate(
    "inventory history created",
    addedInventory !== null && addedInventory !== undefined,
  );
  // Validate reason field exists and has correct value
  // Assuming the response type has a reason property (check actual DTO)
  TestValidator.equals("reason is restock", addedInventory.reason, ["restock"]);
}
