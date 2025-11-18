import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
 * Ensure that deleting an inventory adjustment reason is prevented when it is
 * already referenced by an inventory adjustment.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) and becomes authenticated.
 * 2. Seller joins (POST /auth/seller/join) and becomes authenticated.
 * 3. As seller, create a seller warehouse.
 * 4. As admin, create an inventory state.
 * 5. As seller, create a product.
 * 6. As seller, create a SKU under that product referencing the inventory state.
 * 7. As admin, create an inventory adjustment reason.
 * 8. As admin, create an inventory adjustment that references the reason, seller,
 *    sku, and warehouse.
 * 9. As admin, attempt to delete the reason via DELETE
 *    /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode}.
 * 10. Verify that the delete call fails (throws) because the reason is in use.
 */
export async function test_api_inventory_adjustment_reason_delete_prevented_when_referenced(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins and becomes authenticated
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. As seller, create a seller warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: "Primary Warehouse",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBody,
      },
    );
  typia.assert(warehouse);

  // 4. Switch back to admin and create an inventory state
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const inventoryStateBody = {
    code: `STATE_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 5. Switch to seller again and create a product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Create a SKU under that product referencing the inventory state
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 7. Switch to admin and create an inventory adjustment reason
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  const reasonCode: string = `COUNT_CORRECTION_${RandomGenerator.alphaNumeric(6)}`;
  const reasonBody = {
    code: reasonCode,
    name: "Count Correction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonBody,
      },
    );
  typia.assert(reason);

  // 8. Create an inventory adjustment referencing the reason, seller, sku, and warehouse
  const occurredAt: string = new Date().toISOString();

  const adjustmentBody = {
    seller_id: sellerLoggedIn.id,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: reason.id,
    direction: reason.direction,
    quantity_delta: 5,
    reference_type: "manual_correction",
    reference_id: `REF-${RandomGenerator.alphaNumeric(8)}`,
    note: RandomGenerator.paragraph({ sentences: 2 }),
    occurred_at: occurredAt,
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const adjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      {
        body: adjustmentBody,
      },
    );
  typia.assert(adjustment);

  // 9 & 10. Attempt to delete the reason and ensure it fails because it is referenced
  await TestValidator.error(
    "deleting a referenced inventory adjustment reason must fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase(
        connection,
        {
          reasonCode,
        },
      );
    },
  );
}
