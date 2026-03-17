import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_inventory_with_reference_id_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product (utility fills in shopping_category_id automatically)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with unique option keys
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.name(),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["Small", "Medium", "Large"]),
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create inventory record with RESTOCK reason and reference_id
  const referenceId1 = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecord1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
          reference_id: referenceId1,
        },
      },
    );
  typia.assert(inventoryRecord1);
  // 5. Verify the inventory record has the reference_id stored
  TestValidator.equals(
    "reference_id matches input",
    inventoryRecord1.referenceId,
    referenceId1,
  );
  TestValidator.predicate(
    "quantity_change is positive for restock",
    inventoryRecord1.quantityChange > 0,
  );
  // 6. Create inventory record with CANCELLATION reason and reference_id
  const referenceId2 = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecord2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
          reason: "CANCELLATION",
          reference_id: referenceId2,
        },
      },
    );
  typia.assert(inventoryRecord2);
  TestValidator.equals(
    "cancellation reference_id matches",
    inventoryRecord2.referenceId,
    referenceId2,
  );
  // 7. Create inventory record with REFUND reason and reference_id
  const referenceId3 = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecord3 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
          reason: "REFUND",
          reference_id: referenceId3,
        },
      },
    );
  typia.assert(inventoryRecord3);
  TestValidator.equals(
    "refund reference_id matches",
    inventoryRecord3.referenceId,
    referenceId3,
  );
  // 8. Create inventory record without reference_id (null for manual adjustment)
  const inventoryRecord4 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
          reason: "ADJUSTMENT",
          reference_id: null,
        },
      },
    );
  typia.assert(inventoryRecord4);
  TestValidator.equals(
    "adjustment reference_id is null",
    inventoryRecord4.referenceId,
    null,
  );
}
