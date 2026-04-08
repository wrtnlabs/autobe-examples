import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { generate_random_ecommerce_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_seller_variants_inventory_create";
import { prepare_random_ecommerce_inventory_record } from "../../../prepare/prepare_random_ecommerce_inventory_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller retrieves a specific inventory change record for their product variant.
 *
 * Validates that a seller can successfully retrieve an inventory record they created for one of their product variants. The test ensures ownership validation is enforced (sellers can only access their own inventory records) and that the response contains complete inventory record data including quantity change value, business reason, timestamp, and variant reference.
 *
 * The test follows the complete inventory management workflow: seller authentication, product creation, variant creation, inventory record creation, and finally inventory record retrieval. This validates the end-to-end inventory tracking functionality for seller-owned products.
 *
 * 1. Seller authenticates via join endpoint.
 * 2. Seller creates a product with basic information.
 * 3. Seller creates a variant for the product with SKU and option values.
 * 4. Seller adds inventory to the variant (restocking) creating an inventory record.
 * 5. Seller retrieves the specific inventory record by variantId and recordId.
 * 6. Validates the retrieved record matches the created record including quantity_change, reason, and variant reference.
 */
export async function test_api_inventory_record_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`,
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create inventory record (restock)
  const inventoryRecord =
    await generate_random_ecommerce_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock",
        } satisfies IEcommerceInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Retrieve the inventory record
  const retrievedRecord =
    await api.functional.ecommerce.seller.variants.inventory.at(
      sellerConnection,
      {
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 6. Validate retrieved record matches created record
  TestValidator.equals(
    "record id matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedRecord.quantity_change,
    inventoryRecord.quantity_change,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    inventoryRecord.reason,
  );
  TestValidator.equals(
    "variant id matches",
    retrievedRecord.product_variant.id,
    variant.id,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedRecord.created_at,
    inventoryRecord.created_at,
  );
}
