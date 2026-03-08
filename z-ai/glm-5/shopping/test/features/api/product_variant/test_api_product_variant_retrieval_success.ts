import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product with a category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a product variant with specific option values and price override
  const variantData = {
    skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    optionValues: {
      color: "Blue",
      size: "Medium",
    },
    price: (product.base_price + 500) satisfies number as number &
      tags.Minimum<0.01> &
      tags.Maximum<999999.99>,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: variantData,
      },
    );
  typia.assert(variant);
  // 4. Add inventory records to establish stock quantity (100 units)
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock from supplier",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Retrieve the product variant via public API
  const retrievedVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productId: product.id,
      variantId: variant.id,
    });
  typia.assert(retrievedVariant);
  // 6. Validate variant properties match the created data
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "sku code matches",
    retrievedVariant.skuCode,
    variantData.skuCode,
  );
  TestValidator.equals(
    "option values color",
    retrievedVariant.optionValues.color,
    "Blue",
  );
  TestValidator.equals(
    "option values size",
    retrievedVariant.optionValues.size,
    "Medium",
  );
  TestValidator.equals(
    "price matches",
    retrievedVariant.price,
    variantData.price,
  );
  // 7. Validate stock quantity is correctly calculated from inventory records
  TestValidator.equals(
    "stock quantity is 100",
    retrievedVariant.stockQuantity,
    100,
  );
  // 8. Validate product relationship includes essential information
  TestValidator.equals(
    "product id matches",
    retrievedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedVariant.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price matches",
    retrievedVariant.product.base_price,
    product.base_price,
  );
  // 9. Validate seller and category information is populated
  TestValidator.predicate(
    "product has seller info",
    retrievedVariant.product.seller.id !== undefined,
  );
  TestValidator.predicate(
    "product has category info",
    retrievedVariant.product.category.id !== undefined,
  );
}