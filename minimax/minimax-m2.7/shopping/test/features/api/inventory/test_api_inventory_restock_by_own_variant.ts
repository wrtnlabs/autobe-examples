import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_restock_by_own_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // 2. Create a product listing
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price: typia.random<number>(),
          optionValues: [
            { key: "size", value: "large" },
            { key: "color", value: "red" },
          ],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Restock inventory - first restock
  const restockQuantity1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const inventoryResult1 =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: restockQuantity1,
          operationType: "restock",
          reason: "initial restock from supplier",
        },
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryResult1);
  // Validate first restock
  TestValidator.equals(
    "restock quantity positive",
    inventoryResult1.totalStockQuantity >= restockQuantity1,
    true,
  );
  TestValidator.predicate("recentChanges contains restock", () => {
    const hasRestock = inventoryResult1.recentChanges.some(
      (change) =>
        change.reason === "initial restock from supplier" &&
        change.quantityChange === restockQuantity1,
    );
    return hasRestock;
  });
  // 5. Restock inventory - second restock (verify idempotency/accumulation)
  const restockQuantity2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const inventoryResult2 =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: restockQuantity2,
          operationType: "restock",
          reason: "additional restock",
        },
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryResult2);
  // Validate second restock - stock should accumulate
  TestValidator.equals(
    "stock accumulated",
    inventoryResult2.totalStockQuantity,
    inventoryResult1.totalStockQuantity + restockQuantity2,
  );
  TestValidator.predicate("recentChanges contains second restock", () => {
    const hasSecondRestock = inventoryResult2.recentChanges.some(
      (change) =>
        change.reason === "additional restock" &&
        change.quantityChange === restockQuantity2,
    );
    return hasSecondRestock;
  });
  // 6. Validate total stock value calculation
  TestValidator.predicate(
    "total stock value positive",
    inventoryResult2.totalStockValue > 0,
  );
  TestValidator.predicate(
    "in stock count updated",
    inventoryResult2.inStockCount >= 1,
  );
}
