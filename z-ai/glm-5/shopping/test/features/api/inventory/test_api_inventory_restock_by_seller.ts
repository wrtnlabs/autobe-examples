import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_inventory_restock_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and obtains authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product for the seller
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: categoryId,
      },
    },
  );
  typia.assert(product);
  // 3. Create a product variant with initial stock quantity of 0
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10).toUpperCase(),
          price: null,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            },
          ],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant);
  // 4. Add first inventory record - restock with quantity 100
  const firstQuantity = 100;
  const firstReason = "New shipment received";
  const inventoryRecord1 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: firstQuantity,
          reason: firstReason,
        },
      },
    );
  typia.assert(inventoryRecord1);
  // 5. Verify first inventory record properties
  TestValidator.equals(
    "first record quantity change",
    inventoryRecord1.quantityChange,
    firstQuantity,
  );
  TestValidator.equals(
    "first record reason",
    inventoryRecord1.reason,
    firstReason,
  );
  // 6. Add second inventory record - additional restock with quantity 50
  const secondQuantity = 50;
  const secondReason = "Supplier delivery";
  const inventoryRecord2 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: secondQuantity,
          reason: secondReason,
        },
      },
    );
  typia.assert(inventoryRecord2);
  // 7. Verify second inventory record properties
  TestValidator.equals(
    "second record quantity change",
    inventoryRecord2.quantityChange,
    secondQuantity,
  );
  TestValidator.equals(
    "second record reason",
    inventoryRecord2.reason,
    secondReason,
  );
  // 8. Verify variant reference in inventory records
  TestValidator.equals(
    "variant id in first record",
    inventoryRecord1.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant id in second record",
    inventoryRecord2.variant.id,
    variant.id,
  );
  // 9. Verify inventory records have unique IDs
  TestValidator.notEquals(
    "inventory records have different IDs",
    inventoryRecord1.id,
    inventoryRecord2.id,
  );
  // 10. Verify total inventory additions = 150
  const totalAdded =
    inventoryRecord1.quantityChange + inventoryRecord2.quantityChange;
  TestValidator.equals(
    "total inventory added",
    totalAdded,
    firstQuantity + secondQuantity,
  );
}
