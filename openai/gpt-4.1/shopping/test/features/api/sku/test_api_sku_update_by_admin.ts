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
 * Test that an admin can update SKU details for an existing product SKU and
 * that modifications are properly reflected.
 *
 * Steps:
 *
 * 1. Register a new admin account via /auth/admin/join (establishes admin auth
 *    context)
 * 2. Create a product via admin endpoint
 * 3. Create an SKU under the created product as admin
 * 4. Update the SKU fields (such as price, is_active, barcode, or status) via SKU
 *    update endpoint
 * 5. Confirm the SKUs are updated as expected
 * 6. Attempt to update a non-existent SKU and expect failure (error validation)
 *
 * Business rules enforced: only authorized admin can update SKUs; update must
 * change fields; cannot update non-existent SKUs.
 */
export async function test_api_sku_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: RandomGenerator.pick(["super", "operator", "support"] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new product as admin
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri:
          "https://cdn.example.com/product/" +
          RandomGenerator.alphaNumeric(8) +
          ".jpg",
        status: "active",
        business_status: "approved",
        shipping_weight_grams: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<10000>
        >() satisfies number as number,
        shipping_length_cm: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<200>
        >() satisfies number as number,
        shipping_width_cm: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<200>
        >() satisfies number as number,
        shipping_height_cm: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<200>
        >() satisfies number as number,
        shipping_options: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create SKU for the product as admin
  // The variant_attribute_value_ids array must have at least 1 string, so use a random uuid string.
  const originalSkuCode = RandomGenerator.alphaNumeric(12);
  const variantAttributeValueId = typia.random<string & tags.Format<"uuid">>();
  const sku: IShoppingSku =
    await api.functional.shopping.admin.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: originalSkuCode,
        price: 19900,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(10),
        status: "in_stock",
        variant_attribute_value_ids: [variantAttributeValueId],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Update the SKU: change price, activation status, status and barcode
  const updateBody = {
    price: 29900,
    is_active: false,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "discontinued",
  } satisfies IShoppingSku.IUpdate;
  const updatedSku: IShoppingSku =
    await api.functional.shopping.admin.products.skus.update(connection, {
      productCode: productCode,
      skuCode: originalSkuCode,
      body: updateBody,
    });
  typia.assert(updatedSku);
  TestValidator.equals(
    "sku is updated by admin",
    updatedSku.sku_code,
    originalSkuCode,
  );
  TestValidator.equals("price updated", updatedSku.price, updateBody.price);
  TestValidator.equals(
    "is_active updated",
    updatedSku.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "barcode updated",
    updatedSku.barcode,
    updateBody.barcode,
  );
  TestValidator.equals("status updated", updatedSku.status, updateBody.status);

  // 5. Attempt to update a non-existent SKU and expect error
  await TestValidator.error("updating non-existent sku fails", async () => {
    await api.functional.shopping.admin.products.skus.update(connection, {
      productCode: productCode,
      skuCode: "NOT_FOUND_SKU" + RandomGenerator.alphaNumeric(4),
      body: { price: 12345 } satisfies IShoppingSku.IUpdate,
    });
  });
}
