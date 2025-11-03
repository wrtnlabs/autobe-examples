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
 * Test the legitimate workflow for updating an existing SKU’s details by a
 * seller.
 *
 * 1. Register a seller and authenticate.
 * 2. Create a new product as that seller.
 * 3. Add a SKU to the product (requires at least one attribute value id).
 * 4. Confirm the SKU is present and active.
 * 5. Update mutable fields of the SKU (such as price, barcode, status, is_active).
 * 6. Ensure updates are successful and persisted (verifies audit fields changed
 *    such as updated_at).
 * 7. Attempt updates with invalid data (e.g., negative price, malformed barcode)
 *    and confirm rejections by business rules.
 * 8. Register a different seller; ensure they cannot update the SKU for a product
 *    they do not own.
 */
export async function test_api_seller_update_sku_for_product(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerA);

  // 2. Create product as seller A
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri:
          "https://picsum.photos/seed/" +
          RandomGenerator.alphaNumeric(10) +
          "/400/400",
        status: "draft",
        business_status: "under_review",
        shipping_weight_grams: 1500,
        shipping_length_cm: 30,
        shipping_width_cm: 20,
        shipping_height_cm: 10,
        shipping_options: undefined,
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("product code", product.code, productCode);

  // 3. Compose a pseudo attribute value id as this system allows only known ids but none are listable, so use a random uuid for test coverage.
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();

  // 4. Add SKU to product
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 5000,
        is_active: true,
        barcode: "SKU-" + RandomGenerator.alphaNumeric(8),
        status: "in_stock",
        variant_attribute_value_ids: [attributeValueId],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);
  TestValidator.equals("sku code matches", sku.sku_code, skuCode);
  TestValidator.equals("sku is active", sku.is_active, true);

  // 5. Update SKU - mutate all updatable fields
  const newPrice = 7500;
  const newBarcode = "SKU-NEW-" + RandomGenerator.alphaNumeric(6);
  const newStatus = "discontinued";
  const skuUpdateResp: IShoppingSku =
    await api.functional.shopping.seller.products.skus.update(connection, {
      productCode,
      skuCode,
      body: {
        price: newPrice,
        barcode: newBarcode,
        status: newStatus,
        is_active: false,
      } satisfies IShoppingSku.IUpdate,
    });
  typia.assert(skuUpdateResp);
  TestValidator.equals(
    "sku code stays same after update",
    skuUpdateResp.sku_code,
    skuCode,
  );
  TestValidator.equals("sku updated price", skuUpdateResp.price, newPrice);
  TestValidator.equals(
    "sku updated barcode",
    skuUpdateResp.barcode,
    newBarcode,
  );
  TestValidator.equals("sku updated status", skuUpdateResp.status, newStatus);
  TestValidator.equals("sku is now inactive", skuUpdateResp.is_active, false);
  TestValidator.notEquals(
    "SKU updated_at has changed",
    skuUpdateResp.updated_at,
    sku.updated_at,
  );

  // 6. Attempt invalid update – negative price
  await TestValidator.error(
    "cannot set negative price",
    async () =>
      await api.functional.shopping.seller.products.skus.update(connection, {
        productCode,
        skuCode,
        body: { price: -100 } satisfies IShoppingSku.IUpdate,
      }),
  );

  // 7. Attempt invalid update – malformed barcode (e.g., too short)
  await TestValidator.error(
    "cannot set malformed barcode",
    async () =>
      await api.functional.shopping.seller.products.skus.update(connection, {
        productCode,
        skuCode,
        body: { barcode: "123" } satisfies IShoppingSku.IUpdate,
      }),
  );

  // 8. Register another seller (seller B), attempt to update seller A's SKU
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  // Now seller B is authenticated, but does not own the product/SKU
  await TestValidator.error(
    "other seller cannot update SKU they do not own",
    async () =>
      await api.functional.shopping.seller.products.skus.update(connection, {
        productCode,
        skuCode,
        body: { price: 10000 } satisfies IShoppingSku.IUpdate,
      }),
  );
}
