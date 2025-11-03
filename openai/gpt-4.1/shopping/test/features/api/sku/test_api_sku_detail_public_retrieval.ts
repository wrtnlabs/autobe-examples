import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
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
 * Validate public retrieval of a SKU detail.
 *
 * Business Flow:
 *
 * 1. Register as platform admin
 * 2. Create a product as admin
 * 3. Create two attribute dimensions: color and size (simulate, since attribute
 *    API isn't present)
 * 4. Generate two fake attribute values for variant (
 *
 *    - Color: blue, size: L) (simulate attribute assignment since no attribute
 *         creation API is given)
 * 5. Create and attach a SKU to the product using one attribute value each
 *    (variant_attribute_value_ids)
 * 6. Retrieve the SKU publicly and verify all properties, parent product summary
 *    and variants are included and match, and status is active
 * 7. Test retrieval for non-existent SKU code (expect error)
 * 8. (Optional) Could simulate inactive/deleted SKUs if there was an API to change
 *    these states, but such APIs are not provided, so only valid/existence path
 *    is checked.
 */
export async function test_api_sku_detail_public_retrieval(
  connection: api.IConnection,
) {
  // Platform admin join
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@admin.com";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Create a product as admin
  const productCode = "P-" + RandomGenerator.alphaNumeric(6);
  const createProduct = await api.functional.shopping.admin.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        main_image_uri:
          "https://example.com/images/" + RandomGenerator.alphaNumeric(10),
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(createProduct);
  TestValidator.equals("productCode matches", createProduct.code, productCode);

  // Simulate attribute values (simulate since no create API):
  // Fake value1 = color-blue (uuid), value2 = size-L (uuid)
  // These are not referenced in SKU but needed to satisfy DTO contract.
  // We'll generate random UUIDs and use them in variant_attribute_value_ids
  const attrValueColorId = typia.random<string & tags.Format<"uuid">>();
  const attrValueSizeId = typia.random<string & tags.Format<"uuid">>();

  // Create SKU
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(8);
  const skuPrice = Math.floor(Math.random() * 10000) + 1000;
  const skuStatus = "in_stock";
  const skuBarcode = RandomGenerator.alphaNumeric(12);
  const createSku = await api.functional.shopping.admin.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: skuPrice,
        is_active: true,
        barcode: skuBarcode,
        status: skuStatus,
        variant_attribute_value_ids: [
          attrValueColorId,
          attrValueSizeId,
        ] satisfies string[],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(createSku);
  TestValidator.equals("skuCode matches", createSku.sku_code, skuCode);

  // --- Public retrieval path: ---
  // Retrieve the SKU publicly by product and SKU code
  const pubSku = await api.functional.shopping.products.skus.at(connection, {
    productCode: productCode,
    skuCode: skuCode,
  });
  typia.assert(pubSku);
  // Validate basics
  TestValidator.equals("sku_code matches", pubSku.sku_code, skuCode);
  TestValidator.equals(
    "product code in summary matches",
    pubSku.product.code,
    productCode,
  );
  TestValidator.equals("SKU is active", pubSku.is_active, true);
  TestValidator.equals("SKU price matches", pubSku.price, skuPrice);
  TestValidator.equals("SKU status matches", pubSku.status, skuStatus);
  TestValidator.equals("barcode matches", pubSku.barcode, skuBarcode);
  // Variant attribute IDs match
  const variantIds = pubSku.variant_attributes.map(
    (v) => v.shopping_attribute_value_id,
  );
  TestValidator.equals("variant IDs match", variantIds, [
    attrValueColorId,
    attrValueSizeId,
  ]);
  // Product summary matches
  TestValidator.equals(
    "parent product code in summary",
    pubSku.product.code,
    createProduct.code,
  );
  TestValidator.equals(
    "parent product name in summary",
    pubSku.product.name,
    createProduct.name,
  );
  // Now test retrieval of a non-existent SKU code (should error)
  await TestValidator.error(
    "retrieving nonexistent SKU should fail",
    async () => {
      await api.functional.shopping.products.skus.at(connection, {
        productCode: productCode,
        skuCode: "nonexist-sku-" + RandomGenerator.alphaNumeric(4),
      });
    },
  );
}
