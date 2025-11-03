import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate that only an admin can perform an inventory adjustment for a SKU,
 * and that the adjustment is recorded correctly with before/after quantities,
 * event details, and actor type.
 *
 * Business scenario:
 *
 * 1. Register a new admin (platform administrator account), then authenticate.
 * 2. Register a seller account and authenticate as seller.
 * 3. Seller creates a test product with random code, name, required basic info.
 * 4. Seller creates one SKU under product with random unique sku_code, price,
 *    active status, variant attributes (simulate at least one attribute).
 * 5. Switch back to admin session and perform a manual inventory adjustment for
 *    that SKU, using adjustment_amount, reason_code, context_note, and
 *    actor_type = "admin".
 * 6. Assert that the response contains correct before/after quantities, the
 *    adjustment amount, reason code, expected actor_type, and a valid audit
 *    timestamp.
 * 7. Switch back to seller session, and attempt to adjust the inventory using
 *    admin API endpoint, assert that access is denied.
 */
export async function test_api_inventory_admin_adjustment_creation_for_sku(
  connection: api.IConnection,
) {
  // 1. Register admin (platform administrator) and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(adminAuth);
  // 2. Register seller and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(sellerAuth);

  // 3. Seller creates a test product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreate = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: "https://dummyimage.com/600x400/000/fff",
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 4. Seller creates one SKU (with one random attribute value ID). Simulate at least one attribute value/generate a fake one.
  // Since attribute values/dimensions are not creatable in this test, use a UUID as a fake attribute value. Otherwise, in a real test, would lookup product attributes.
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreate = {
    sku_code: skuCode,
    price: 1000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [attributeValueId],
  } satisfies IShoppingSku.ICreate;
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: skuCreate,
    });
  typia.assert(sku);

  // 5. Switch back to admin session (implicitly, connection's Authorization gets overwritten by each join)
  await api.functional.auth.admin.join(connection, { body: adminJoin });

  // 6. Admin adjusts the SKU inventory
  const adjustmentAmount = 50;
  const reasonCode = "manual_restock";
  const contextNote = "Manual restock for test.";
  const adjustmentCreate = {
    sku_code: skuCode,
    adjustment_amount: adjustmentAmount,
    reason_code: reasonCode,
    actor_type: "admin",
    context_note: contextNote,
  } satisfies IShoppingInventoryAdjustment.ICreate;
  const adjustment: IShoppingInventoryAdjustment =
    await api.functional.shopping.admin.inventory.adjustments.create(
      connection,
      { skuCode: skuCode, body: adjustmentCreate },
    );
  typia.assert(adjustment);
  TestValidator.equals(
    "adjustment sku_code matches",
    adjustmentCreate.sku_code,
    skuCode,
  );
  TestValidator.equals(
    "adjustment amount matches",
    adjustment.adjustment_amount,
    adjustmentAmount,
  );
  TestValidator.equals("actor_type is admin", adjustment.actor_type, "admin");
  TestValidator.equals(
    "reason_code is manual_restock",
    adjustment.reason_code,
    reasonCode,
  );
  TestValidator.equals(
    "context_note matches if present",
    adjustment.context_note,
    contextNote,
  );
  TestValidator.predicate(
    "quantity after == quantity before + adjustment_amount",
    adjustment.quantity_after === adjustment.quantity_before + adjustmentAmount,
  );
  TestValidator.predicate(
    "audit timestamp is ISO string",
    typeof adjustment.created_at === "string" &&
      /T.*Z$/.test(adjustment.created_at),
  );

  // 7. Switch to seller session
  await api.functional.auth.seller.join(connection, { body: sellerJoin });
  // 8. Seller tries to adjust inventory using admin endpoint - expect error
  await TestValidator.error(
    "non-admin cannot adjust inventory via admin endpoint",
    async () => {
      await api.functional.shopping.admin.inventory.adjustments.create(
        connection,
        {
          skuCode: skuCode,
          body: adjustmentCreate,
        },
      );
    },
  );
}
