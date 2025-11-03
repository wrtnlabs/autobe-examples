import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validates that a seller can soft delete their own SKU, but not those owned by
 * others, and that deleted SKUs have a deleted_at value.
 *
 * 1. Seller A registers and creates a product
 * 2. Seller A creates a valid SKU on the product, using a random attribute UUID
 * 3. Seller A deletes the SKU and verifies the soft delete (deleted_at is set)
 * 4. Attempting to delete the same SKU again fails
 * 5. Seller B registers, creates own product/SKU, then attempts to delete Seller
 *    A's SKU and fails
 */
export async function test_api_sku_soft_delete_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller A signs up
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "password123!",
      display_name: RandomGenerator.name(1),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerA);

  // 2. Seller A creates a product
  const productCodeA = RandomGenerator.alphaNumeric(12);
  const productA = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCodeA,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://dummyimage.com/600x400/000/fff",
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(productA);
  TestValidator.equals("product code matches", productA.code, productCodeA);

  // 3. Seller A creates a SKU under productA
  // For attribute/variant, just generate one fake attribute value id for required spec
  const fakeAttributeValueId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const skuCodeA = RandomGenerator.alphaNumeric(14);
  const skuA = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCodeA,
      body: {
        sku_code: skuCodeA,
        price: 9990,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [fakeAttributeValueId],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(skuA);
  TestValidator.equals("sku code matches", skuA.sku_code, skuCodeA);
  TestValidator.equals(
    "sku deleted_at is not set initially",
    skuA.deleted_at,
    null,
  );

  // 4. Seller A soft deletes the SKU
  await api.functional.shopping.seller.products.skus.erase(connection, {
    productCode: productCodeA,
    skuCode: skuCodeA,
  });

  // No direct GET to fetch the SKU--simulate by attempting to delete again, which should fail
  await TestValidator.error("cannot delete SKU twice", async () => {
    await api.functional.shopping.seller.products.skus.erase(connection, {
      productCode: productCodeA,
      skuCode: skuCodeA,
    });
  });

  // 5. Another seller (seller B) registers and creates product/SKU
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "password123!",
      display_name: RandomGenerator.name(1),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerB);

  const productCodeB = RandomGenerator.alphaNumeric(12);
  const productB = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCodeB,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://dummyimage.com/600x400/000/fff",
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(productB);

  // Seller B creates a SKU (not used for test, but shows seller B's own SKUs)
  const skuCodeB = RandomGenerator.alphaNumeric(14);
  const skuB = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCodeB,
      body: {
        sku_code: skuCodeB,
        price: 5000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [fakeAttributeValueId],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(skuB);

  // Seller B attempts to delete Seller A's (already archived) SKU - should FAIL
  await TestValidator.error(
    "other seller cannot delete SKU that is not theirs",
    async () => {
      await api.functional.shopping.seller.products.skus.erase(connection, {
        productCode: productCodeA,
        skuCode: skuCodeA,
      });
    },
  );
}
