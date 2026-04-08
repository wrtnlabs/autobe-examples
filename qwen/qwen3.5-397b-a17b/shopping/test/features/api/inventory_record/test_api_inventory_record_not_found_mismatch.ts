import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test inventory record retrieval with mismatched variantId returns 404 Not Found.
 *
 * Validates the ownership validation logic when an administrator attempts to retrieve an inventory record using a variantId that doesn't match the record's actual variant. This test ensures the system properly validates the relationship between the variantId path parameter and the inventory record's shopping_mall_product_variant_id before returning data.
 *
 * The test creates two variants (Variant A and Variant B) under the same product, creates an inventory record for Variant A, then attempts to retrieve that record using Variant B's variantId. The system should reject this mismatched combination with 404 Not Found, preventing unauthorized access through recordId guessing.
 *
 * 1. Administrator authenticates and creates a category for product organization.
 * 2. Seller authenticates and creates a product under the category.
 * 3. Seller creates Variant A with unique SKU code for the product.
 * 4. Seller creates Variant B with different SKU code for the same product.
 * 5. Seller creates an inventory record for Variant A (restocking operation).
 * 6. Administrator attempts to retrieve Variant A's inventory record using Variant B's variantId (mismatch scenario).
 * 7. Validates that the mismatched request returns 404 Not Found.
 * 8. Also validates that requesting a completely non-existent recordId returns 404 Not Found.
 * 9. Confirms that the correct variantId and recordId combination successfully retrieves the record.
 */
export async function test_api_inventory_record_not_found_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - authenticate and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - authenticate and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create Variant A (will have the inventory record)
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          option_values: `Color: Red, Size: Large`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variantA);
  // 4. Create Variant B (different variant for mismatch testing)
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          option_values: `Color: Blue, Size: Small`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variantB);
  // 5. Create inventory record for Variant A
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variantA.id },
        body: {
          quantity_delta: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: RandomGenerator.pick([
            "RESTOCK",
            "ADJUSTMENT",
            "ORDER_CANCELLATION",
          ] as const),
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Test mismatch scenario: Variant B's variantId with Variant A's recordId
  // This should return 404 Not Found due to ownership validation
  await TestValidator.error(
    "mismatched variantId and recordId returns 404",
    async () => {
      await api.functional.shoppingMall.admin.variants.inventory_records.at(
        adminConnection,
        {
          variantId: variantB.id,
          recordId: inventoryRecord.id,
        },
      );
    },
  );
  // 7. Test non-existent recordId scenario
  const nonExistentRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent recordId returns 404", async () => {
    await api.functional.shoppingMall.admin.variants.inventory_records.at(
      adminConnection,
      {
        variantId: variantA.id,
        recordId: nonExistentRecordId,
      },
    );
  });
  // 8. Test successful retrieval with correct variantId and recordId
  const retrievedRecord =
    await api.functional.shoppingMall.admin.variants.inventory_records.at(
      adminConnection,
      {
        variantId: variantA.id,
        recordId: inventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 9. Validate retrieved record matches the created record
  TestValidator.equals(
    "record ID matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "quantity delta matches",
    retrievedRecord.quantityDelta,
    inventoryRecord.quantityDelta,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    inventoryRecord.reason,
  );
  TestValidator.equals(
    "variant ID matches",
    retrievedRecord.productVariant.id,
    variantA.id,
  );
}
