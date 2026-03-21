import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_record_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  // 4. Add inventory (restock) to create an inventory record
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: "restock",
          quantity: 10,
          reason: "restock",
        },
      },
    );
  // 5. Call GET on the inventory record endpoint
  const retrievedRecord =
    await api.functional.ecommerceMall.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  // Validate response with typia.assert
  typia.assert(retrievedRecord);
  // Validate business logic
  TestValidator.equals(
    "record id matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.predicate(
    "quantity change is positive for restock",
    retrievedRecord.quantity_change > 0,
  );
  TestValidator.equals("reason is restock", retrievedRecord.reason, "restock");
  TestValidator.predicate(
    "calculated stock quantity is non-negative",
    retrievedRecord.calculated_stock_quantity >= 0,
  );
  TestValidator.equals(
    "variant id matches",
    retrievedRecord.variant.id,
    variant.id,
  );
}
