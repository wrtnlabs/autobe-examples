import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_inventory_adjustment_negative(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedSeller);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with initial stock of 50
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ size: "L", color: "blue" }),
          stock_quantity: 50,
        },
      },
    );
  typia.assert(variant);
  // 4. First inventory adjustment: -10 (damaged goods)
  const firstAdjustment =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: -10,
          operation_type: "ADJUSTMENT",
          reference_id: null,
          notes: "Damaged goods discovered during stock check",
        },
      },
    );
  typia.assert(firstAdjustment);
  // Verify first adjustment record
  TestValidator.equals(
    "quantity_change is -10",
    firstAdjustment.quantity_change,
    -10,
  );
  TestValidator.equals(
    "operation_type is ADJUSTMENT",
    firstAdjustment.operation_type,
    "ADJUSTMENT",
  );
  TestValidator.equals(
    "reference_id is null for manual adjustment",
    firstAdjustment.reference_id,
    null,
  );
  TestValidator.equals(
    "notes captures business context",
    firstAdjustment.notes,
    "Damaged goods discovered during stock check",
  );
  typia.assert(firstAdjustment.created_at);
  typia.assert(firstAdjustment.updated_at);
  typia.assert(firstAdjustment.deleted_at === null);
  typia.assert(
    firstAdjustment.ecommerce_mall_product_variant_id === variant.id,
  );
  // 5. Second inventory adjustment: -15 (cumulative test)
  const secondAdjustment =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: -15,
          operation_type: "ADJUSTMENT",
          reference_id: null,
          notes: "Inventory correction during annual count",
        },
      },
    );
  typia.assert(secondAdjustment);
  // Verify second adjustment record
  TestValidator.equals(
    "quantity_change is -15",
    secondAdjustment.quantity_change,
    -15,
  );
  TestValidator.equals(
    "operation_type is ADJUSTMENT",
    secondAdjustment.operation_type,
    "ADJUSTMENT",
  );
  TestValidator.notEquals(
    "second adjustment ID differs from first",
    firstAdjustment.id,
    secondAdjustment.id,
  );
  typia.assert(secondAdjustment.created_at);
  typia.assert(secondAdjustment.updated_at);
  typia.assert(secondAdjustment.deleted_at === null);
  typia.assert(
    secondAdjustment.ecommerce_mall_product_variant_id === variant.id,
  );
  // 6. Verify both adjustment records have negative quantity_change
  TestValidator.predicate(
    "first adjustment has negative quantity",
    () => firstAdjustment.quantity_change < 0,
  );
  TestValidator.predicate(
    "second adjustment has negative quantity",
    () => secondAdjustment.quantity_change < 0,
  );
}
