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

export async function test_api_inventory_adjustment_update_direction_and_occurred_at_for_backdated_correction(
  connection: api.IConnection,
) {
  // 1. Seller joins to be able to own products, SKUs, and warehouses
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerId = sellerAuth.id;

  // 2. Seller creates a warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Admin joins and logs in to gain admin privileges
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: "Adm1n-P@ss" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // Extra explicit login step as scenario describes join + login dependency
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuth);

  // 4. Admin creates an inventory state that SKUs can reference
  const skuInventoryStateBody = {
    code: `STATE-${RandomGenerator.alphaNumeric(6)}`,
    name: "In stock - normal",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert(skuInventoryState);

  // 5. Switch back to seller context is not needed explicitly because seller operations
  // already authenticated earlier. We rely on existing seller token for seller APIs.

  // 5. Seller creates a product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/prod.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Seller creates a SKU for that product
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: `BC-${RandomGenerator.alphaNumeric(10)}`,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 50,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [
      {
        system_code: "ERP",
        external_id: `ERP-${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IShoppingMallSkuExternalId.ICreate,
    ],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Switch to admin context is already ensured by admin login above; admin token
  // is active for subsequent admin endpoints.

  // 7. Admin creates an inventory adjustment reason with initial direction "increase"
  const reasonBody = {
    code: `REASON-${RandomGenerator.alphaNumeric(6)}`,
    name: "Stock correction",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;
  const reason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: reasonBody },
    );
  typia.assert(reason);

  // 8. Admin creates an initial inventory adjustment
  const initialOccurredAt = new Date().toISOString();
  const createAdjustmentBody = {
    seller_id: sellerId,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: reason.id,
    direction: reason.direction,
    quantity_delta: 10,
    reference_type: "manual_correction",
    reference_id: `REF-${RandomGenerator.alphaNumeric(6)}`,
    note: RandomGenerator.paragraph({ sentences: 6 }),
    occurred_at: initialOccurredAt as string & tags.Format<"date-time">,
  } satisfies IShoppingMallInventoryAdjustment.ICreate;
  const initialAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      { body: createAdjustmentBody },
    );
  typia.assert(initialAdjustment);

  // Capture originals for comparison
  const originalId = initialAdjustment.id;
  const originalSellerId = initialAdjustment.seller_id;
  const originalSkuId = initialAdjustment.sku_id;
  const originalWarehouseId = initialAdjustment.seller_warehouse_id;
  const originalReasonId = initialAdjustment.inventory_adjustment_reason_id;
  const originalQuantityDelta = initialAdjustment.quantity_delta;
  const originalDirection = initialAdjustment.direction;
  const originalOccurredAt = initialAdjustment.occurred_at;
  const originalCreatedAt = initialAdjustment.created_at;

  // 9. Prepare update payload to simulate backdated correction: change direction and occurred_at
  const laterOccurredAt = new Date(Date.now() + 60 * 1000).toISOString();
  const updateBody = {
    direction: "decrease",
    occurred_at: laterOccurredAt as string & tags.Format<"date-time">,
    reference_type: "manual_correction_adjusted",
    reference_id: `REF-UPDATED-${RandomGenerator.alphaNumeric(6)}`,
    note: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallInventoryAdjustment.IUpdate;

  const updated: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.update(
      connection,
      {
        inventoryAdjustmentId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 10. Validate invariants and updated fields
  TestValidator.equals(
    "inventory adjustment id should remain unchanged",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "seller_id should remain unchanged",
    updated.seller_id,
    originalSellerId,
  );

  TestValidator.equals(
    "sku_id should remain unchanged",
    updated.sku_id,
    originalSkuId,
  );

  TestValidator.equals(
    "seller_warehouse_id should remain unchanged",
    updated.seller_warehouse_id,
    originalWarehouseId,
  );

  TestValidator.equals(
    "inventory_adjustment_reason_id should remain unchanged",
    updated.inventory_adjustment_reason_id,
    originalReasonId,
  );

  TestValidator.equals(
    "quantity_delta should remain unchanged",
    updated.quantity_delta,
    originalQuantityDelta,
  );

  TestValidator.equals(
    "direction should be updated to new value",
    updated.direction,
    updateBody.direction,
  );

  TestValidator.notEquals(
    "direction should differ from original direction",
    updated.direction,
    originalDirection,
  );

  TestValidator.equals(
    "occurred_at should be updated to new timestamp",
    updated.occurred_at,
    updateBody.occurred_at,
  );

  TestValidator.notEquals(
    "occurred_at should differ from original occurred_at",
    updated.occurred_at,
    originalOccurredAt,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be same or after created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );

  TestValidator.equals(
    "updated reference_type should be applied",
    updated.reference_type,
    updateBody.reference_type,
  );

  TestValidator.equals(
    "updated reference_id should be applied",
    updated.reference_id,
    updateBody.reference_id,
  );

  TestValidator.equals(
    "updated note should be applied",
    updated.note,
    updateBody.note,
  );
}
