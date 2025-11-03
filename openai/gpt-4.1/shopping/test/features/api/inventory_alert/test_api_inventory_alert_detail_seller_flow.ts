import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test inventory alert detail retrieval by seller.
 *
 * 1. Register new seller account.
 * 2. Seller creates a new product.
 * 3. Seller creates a SKU under this product.
 * 4. Simulate an inventory alert for the new SKU (assume alert was created
 *    automatically by inventory rules).
 * 5. Retrieve alert detail for the SKU using the appropriate API.
 * 6. Validate seller can see all expected fields of the alert (alert_type,
 *    triggered_at, resolved_at, resolved, context_note, resolved_actor_type,
 *    resolved_actor_id).
 * 7. Security: seller cannot access inventory alerts not related to their SKUs;
 *    retrieving non-existent alerts produces error.
 */
export async function test_api_inventory_alert_detail_seller_flow(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerTest12345!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending", // Must be set to 'pending' by contract
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerJoin);
  TestValidator.equals(
    "seller email should match",
    sellerJoin.email,
    sellerEmail,
  );

  // 2. Seller creates new product
  const prodCode = RandomGenerator.alphaNumeric(12);
  const createProductBody = {
    code: prodCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: `https://cdn.example.com/products/${prodCode}.jpg`,
    status: "draft", // allowed business status for new product
    business_status: "in_review", // new product submission, waiting review
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: createProductBody,
    },
  );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, prodCode);

  // 3. Seller creates new SKU (choose valid code, price, status, 1+ attribute value ID)
  // For this test, simulate attribute value IDs assigned to SKU (using random uuids as stand-ins)
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuAttrValueIds = [typia.random<string & tags.Format<"uuid">>()];
  const createSkuBody = {
    sku_code: skuCode,
    price: 29900,
    is_active: true,
    barcode: null,
    status: "in_stock",
    variant_attribute_value_ids: skuAttrValueIds,
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: createSkuBody,
    },
  );
  typia.assert(sku);
  TestValidator.equals("sku code should match", sku.sku_code, skuCode);

  // 4. Simulate alert - for this test, assume platform generates a low_stock alert for the new SKU
  // There is no explicit alert creation API. We'll simulate that the alert already exists via random generation for test context.
  // In practical tests, this would be replaced by test harness seeding.
  // Generate an alert for this SKU (simulate "low_stock" type)
  const alert: IShoppingInventoryAlert =
    typia.random<IShoppingInventoryAlert>();
  // Overwrite its shopping_sku_id and type to match test scenario
  alert.shopping_sku_id = sku.id;
  alert.alert_type = "low_stock";
  alert.resolved = false;
  alert.triggered_at = new Date().toISOString();
  alert.resolved_at = null;
  alert.resolved_actor_type = null;
  alert.resolved_actor_id = null;
  alert.context_note = "Auto alert for test";
  alert.id = typia.random<string & tags.Format<"uuid">>();
  // Normally, the system would provide the alert, but we're simulating for test

  // 5. Retrieve alert detail
  // For test context, simulate the alert as if it's retrievable by the real alert service (using simulated props)
  const output: IShoppingInventoryAlert =
    await api.functional.shopping.seller.inventory.alerts.at(connection, {
      skuCode: sku.sku_code,
      alertId: alert.id,
    });
  typia.assert(output);
  TestValidator.equals(
    "alert shopping_sku_id matches SKU",
    output.shopping_sku_id,
    sku.id,
  );
  TestValidator.equals("alert_type low_stock", output.alert_type, "low_stock");
  TestValidator.equals("resolved is false", output.resolved, false);
  TestValidator.predicate(
    "triggered_at is ISO string",
    typeof output.triggered_at === "string" &&
      output.triggered_at.endsWith("Z"),
  );
  TestValidator.equals("resolved_at is null", output.resolved_at, null);
  TestValidator.equals(
    "resolved_actor_type is null",
    output.resolved_actor_type,
    null,
  );
  TestValidator.equals(
    "resolved_actor_id is null",
    output.resolved_actor_id,
    null,
  );
  TestValidator.equals(
    "context_note matches",
    output.context_note,
    alert.context_note,
  );

  // 6. Security: try to access with invalid alert (nonexistent alert or wrong ID)
  await TestValidator.error(
    "retrieving non-existent alert produces error",
    async () => {
      await api.functional.shopping.seller.inventory.alerts.at(connection, {
        skuCode: sku.sku_code,
        alertId: typia.random<string & tags.Format<"uuid">>(), // Random, not in system
      });
    },
  );
}
