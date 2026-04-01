import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_update } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_update";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_record } from "../../../prepare/prepare_random_shopping_mall_product_inventory_record";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_cumulative_stock_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create Product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create Option Definition (Color)
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // 4. Create Option Value (Blue)
  const optionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Blue",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // 5. Create Product Variant with unique SKU
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(12)}`,
          price_override: null,
          option_value_ids: [optionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. First Inventory Adjustment: +100 units
  const record1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Warehouse restock",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(record1);
  TestValidator.equals("first adjustment stock", record1.current_stock, 100);
  TestValidator.equals(
    "first adjustment quantity",
    record1.quantity_change,
    100,
  );
  TestValidator.equals(
    "first adjustment reason",
    record1.reason,
    "Warehouse restock",
  );
  // 7. Second Inventory Adjustment: -20 units
  const record2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: -20,
          reason: "Promotional allocation",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(record2);
  TestValidator.equals("second adjustment stock", record2.current_stock, 80);
  TestValidator.equals(
    "second adjustment quantity",
    record2.quantity_change,
    -20,
  );
  TestValidator.equals(
    "second adjustment reason",
    record2.reason,
    "Promotional allocation",
  );
  // 8. Third Inventory Adjustment: +50 units
  const record3 =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 50,
          reason: "Returned inventory",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(record3);
  TestValidator.equals("third adjustment stock", record3.current_stock, 130);
  TestValidator.equals(
    "third adjustment quantity",
    record3.quantity_change,
    50,
  );
  TestValidator.equals(
    "third adjustment reason",
    record3.reason,
    "Returned inventory",
  );
  // 9. Fourth Inventory Adjustment: -10 units
  const record4 =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: -10,
          reason: "Inventory correction",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(record4);
  TestValidator.equals("fourth adjustment stock", record4.current_stock, 120);
  TestValidator.equals(
    "fourth adjustment quantity",
    record4.quantity_change,
    -10,
  );
  TestValidator.equals(
    "fourth adjustment reason",
    record4.reason,
    "Inventory correction",
  );
  // 10. Final Validation: Verify cumulative calculation
  const expectedTotal = 100 - 20 + 50 - 10;
  TestValidator.equals(
    "final cumulative stock calculation",
    record4.current_stock,
    expectedTotal,
  );
  TestValidator.equals(
    "cumulative sum verification",
    record1.quantity_change +
      record2.quantity_change +
      record3.quantity_change +
      record4.quantity_change,
    expectedTotal,
  );
}