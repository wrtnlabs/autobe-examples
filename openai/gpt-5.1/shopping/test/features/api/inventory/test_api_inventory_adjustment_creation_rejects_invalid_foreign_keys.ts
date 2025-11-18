import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustment";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that admin inventory adjustments cannot be created with invalid
 * foreign keys.
 *
 * Business goal:
 *
 * - Ensure POST /shoppingMall/admin/inventoryAdjustments enforces referential
 *   integrity for sku_id, seller_warehouse_id, and
 *   inventory_adjustment_reason_id.
 * - Requests with non-existent UUIDs in those fields must fail with a business
 *   error (4xx HTTP error at runtime), and no adjustment record should be
 *   created.
 * - The test keeps type-safety intact and never sends wrong-typed data.
 *
 * High-level steps:
 *
 * 1. Create and authenticate an admin.
 * 2. Create and authenticate a seller.
 * 3. As seller, create a product.
 * 4. As admin, create a SKU inventory state.
 * 5. As seller, create a SKU for the product referencing the inventory state.
 * 6. As seller, create a seller warehouse.
 * 7. As admin, create an inventory adjustment reason.
 * 8. As admin, attempt to create inventory adjustments with:
 *
 *    - All three FKs invalid (sku_id, seller_warehouse_id,
 *         inventory_adjustment_reason_id).
 *    - Only sku_id invalid.
 *    - Only seller_warehouse_id invalid.
 *    - Only inventory_adjustment_reason_id invalid.
 * 9. For each invalid-FK scenario, assert that the adjustment creation call
 *    throws, using TestValidator.error with proper async/await handling.
 */
export async function test_api_inventory_adjustment_creation_rejects_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // 1. Admin join (auto-authenticated)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Ensure seller login works (and resets auth context to seller)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Seller creates a product
  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: RandomGenerator.alphabets(6),
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/primary.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Switch back to admin and create a SKU inventory state
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  const skuInventoryStateBody = {
    code: `STATE-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Inventory available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert(skuInventoryState);

  // 5. Switch to seller again and create a SKU for the product
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 50,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Seller creates a warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: "Test Warehouse",
    description: "Primary test warehouse",
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;
  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: warehouseBody },
    );
  typia.assert(warehouse);

  // 7. Switch back to admin and create an inventory adjustment reason
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const adjustmentReasonBody = {
    code: `ADJ-${RandomGenerator.alphaNumeric(6)}`,
    name: "Manual Correction",
    description: "Manual stock correction for testing invalid foreign keys",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;
  const adjustmentReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: adjustmentReasonBody },
    );
  typia.assert(adjustmentReason);

  // 8. Prepare invalid UUIDs that will not be used in any creation
  const invalidSkuId = typia.random<string & tags.Format<"uuid">>();
  const invalidWarehouseId = typia.random<string & tags.Format<"uuid">>();
  const invalidReasonId = typia.random<string & tags.Format<"uuid">>();

  const sellerId = sellerAuthorized.id;

  // Helper to build a base valid-looking adjustment body
  const buildAdjustmentBody = (params: {
    skuId: string & tags.Format<"uuid">;
    warehouseId: string & tags.Format<"uuid">;
    reasonId: string & tags.Format<"uuid">;
  }): IShoppingMallInventoryAdjustment.ICreate => {
    const body: IShoppingMallInventoryAdjustment.ICreate = {
      seller_id: sellerId,
      sku_id: params.skuId,
      seller_warehouse_id: params.warehouseId,
      inventory_adjustment_reason_id: params.reasonId,
      direction: "increase",
      quantity_delta: 10,
      reference_type: "manual_correction",
      reference_id: `REF-${RandomGenerator.alphaNumeric(10)}`,
      note: "E2E test: invalid foreign key references",
      occurred_at: new Date().toISOString(),
    };
    return body;
  };

  // Scenario A: all three foreign keys invalid
  await TestValidator.error(
    "inventory adjustment creation must fail when all foreign keys are invalid",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body: buildAdjustmentBody({
            skuId: invalidSkuId,
            warehouseId: invalidWarehouseId,
            reasonId: invalidReasonId,
          }),
        },
      );
    },
  );

  // Scenario B: only sku_id invalid
  await TestValidator.error(
    "inventory adjustment creation must fail when sku_id is invalid",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body: buildAdjustmentBody({
            skuId: invalidSkuId,
            warehouseId: warehouse.id,
            reasonId: adjustmentReason.id,
          }),
        },
      );
    },
  );

  // Scenario C: only seller_warehouse_id invalid
  await TestValidator.error(
    "inventory adjustment creation must fail when seller_warehouse_id is invalid",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body: buildAdjustmentBody({
            skuId: sku.id,
            warehouseId: invalidWarehouseId,
            reasonId: adjustmentReason.id,
          }),
        },
      );
    },
  );

  // Scenario D: only inventory_adjustment_reason_id invalid
  await TestValidator.error(
    "inventory adjustment creation must fail when inventory_adjustment_reason_id is invalid",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body: buildAdjustmentBody({
            skuId: sku.id,
            warehouseId: warehouse.id,
            reasonId: invalidReasonId,
          }),
        },
      );
    },
  );

  // Optional control: demonstrate that a fully valid adjustment would succeed
  const validAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      {
        body: buildAdjustmentBody({
          skuId: sku.id,
          warehouseId: warehouse.id,
          reasonId: adjustmentReason.id,
        }),
      },
    );
  typia.assert(validAdjustment);

  TestValidator.equals(
    "valid inventory adjustment should belong to the expected seller",
    validAdjustment.seller_id,
    sellerId,
  );
}
