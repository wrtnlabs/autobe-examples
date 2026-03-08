import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_admin_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_admin_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that the current_stock field is correctly calculated by summing all inventory records for a variant.
 *
 * This test validates the core business logic that current stock is calculated from inventory history
 * rather than stored as a single value, ensuring data integrity and audit trail accuracy.
 */
export async function test_api_inventory_record_current_stock_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Set up seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: RandomGenerator.alphabets(5) },
          ] as IEcommerceMallProductVariantOption[],
          stockQuantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 6. Create first inventory record with quantityChange of 50
  const record1 =
    await generate_random_ecommerce_mall_admin_variants_inventory_records_create(
      adminConnection,
      {
        body: {
          quantityChange: 50,
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(record1);
  TestValidator.equals("first record currentStock", record1.currentStock, 50);
  // 7. Create second inventory record with quantityChange of 30
  const record2 =
    await generate_random_ecommerce_mall_admin_variants_inventory_records_create(
      adminConnection,
      {
        body: {
          quantityChange: 30,
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(record2);
  TestValidator.equals("second record currentStock", record2.currentStock, 80);
  // 8. Create third inventory record with quantityChange of -20
  const record3 =
    await generate_random_ecommerce_mall_admin_variants_inventory_records_create(
      adminConnection,
      {
        body: {
          quantityChange: -20,
          reason: "order_placement",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(record3);
  TestValidator.equals("third record currentStock", record3.currentStock, 60);
  // 9. Verify each inventory record captures the currentStock snapshot at the time of recording
  TestValidator.equals("record 1 snapshot", record1.currentStock, 50);
  TestValidator.equals("record 2 snapshot", record2.currentStock, 80);
  TestValidator.equals("record 3 snapshot", record3.currentStock, 60);
  // 10. Manually calculate sum and verify matches latest currentStock
  const totalQuantityChange =
    record1.quantityChange + record2.quantityChange + record3.quantityChange;
  TestValidator.equals(
    "total quantity change matches latest currentStock",
    totalQuantityChange,
    record3.currentStock,
  );
}