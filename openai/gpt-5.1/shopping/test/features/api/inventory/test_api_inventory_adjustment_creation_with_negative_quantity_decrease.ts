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
 * Validate creation of an inventory adjustment that decreases stock using a
 * negative quantity_delta.
 *
 * Business flow:
 *
 * 1. Create and authenticate an admin via /auth/admin/join (admin is kept as
 *    current actor for admin APIs).
 * 2. Create and authenticate a seller via /auth/seller/join so we have a concrete
 *    seller_id for inventory ownership.
 * 3. As the authenticated seller, create a product by POST
 *    /shoppingMall/seller/products.
 * 4. As the same seller, create a SKU for that product via POST
 *    /shoppingMall/seller/products/{productId}/skus, using a valid
 *    inventory_state created by admin.
 * 5. As the seller, create a seller warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses.
 * 6. As the admin, create a SKU inventory state via
 *    /shoppingMall/admin/skuInventoryStates that is purchasable (e.g.,
 *    "in_stock").
 * 7. As the admin, create an inventory adjustment reason with direction
 *    representing a decrease (e.g., "decrease") via
 *    /shoppingMall/admin/inventoryAdjustmentReasons.
 * 8. As the admin, call /shoppingMall/admin/inventoryAdjustments with an
 *    IShoppingMallInventoryAdjustment.ICreate body referencing
 *
 *    - Seller_id: from seller auth
 *    - Sku_id: from created SKU
 *    - Seller_warehouse_id: from created warehouse
 *    - Inventory_adjustment_reason_id: from created reason
 *    - Direction: same string as the reason.direction (decrease semantics)
 *    - Quantity_delta: a negative integer such as -10
 *    - Occurred_at: current timestamp in ISO 8601
 *    - Reference_type/reference_id/note: optional context for damaged goods.
 * 9. Assert the response using typia.assert and verify business correctness:
 *
 *    - Seller_id, sku_id, seller_warehouse_id, inventory_adjustment_reason_id in the
 *         response match the inputs.
 *    - Direction equals the direction passed in the request.
 *    - Quantity_delta equals the negative delta passed in the request (e.g., -10).
 *
 * The test ensures that a negative quantity_delta is accepted in combination
 * with a decrease-oriented direction and reason, and that the created
 * adjustment record faithfully persists these values.
 */
export async function test_api_inventory_adjustment_creation_with_negative_quantity_decrease(
  connection: api.IConnection,
) {
  // 1. Admin join (creates and authenticates admin)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> =
    "AdminPassword123!" as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Seller join (creates and authenticates seller, switches connection token)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> =
    "SellerPassword123!" as string & tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerId: string & tags.Format<"uuid"> = sellerAuth.id;

  // 3. As seller, create a product
  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TEST_BRAND",
    model_name: "MODEL-001",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. As admin, create a purchasable inventory state
  // Switch back to admin by logging in
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Purchasable in-stock state for SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 5. Switch to seller again and create a SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const initialInventoryQuantity = 100 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: initialInventoryQuantity,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. As seller, create a warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Warehouse",
    description: "Primary seller warehouse for inventory tests",
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

  // 7. Switch to admin and create a decrease-oriented inventory adjustment reason
  const adminLoginAgainBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminLoginAgain);

  const reasonDirection = "decrease";

  const reasonCreateBody = {
    code: `DAMAGE_LOSS_${RandomGenerator.alphaNumeric(6)}`,
    name: "Damage / Loss",
    description: "Inventory loss due to damage or shrinkage",
    direction: reasonDirection,
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonCreateBody,
      },
    );
  typia.assert(reason);

  // 8. As admin, create an inventory adjustment with negative quantity_delta
  const negativeDelta = -10;
  const occurredAt = new Date().toISOString();

  const adjustmentCreateBody = {
    seller_id: sellerId,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: reason.id,
    direction: reasonDirection,
    quantity_delta: negativeDelta,
    reference_type: "damaged_goods",
    reference_id: `REF-${RandomGenerator.alphaNumeric(10)}`,
    note: "Stock decreased due to damaged items during handling.",
    occurred_at: occurredAt,
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const adjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      {
        body: adjustmentCreateBody,
      },
    );
  typia.assert(adjustment);

  // 9. Business assertions on the created adjustment
  TestValidator.equals(
    "inventory adjustment seller_id matches input seller_id",
    adjustment.seller_id,
    adjustmentCreateBody.seller_id,
  );

  TestValidator.equals(
    "inventory adjustment sku_id matches created SKU id",
    adjustment.sku_id,
    adjustmentCreateBody.sku_id,
  );

  TestValidator.equals(
    "inventory adjustment seller_warehouse_id matches created warehouse id",
    adjustment.seller_warehouse_id,
    adjustmentCreateBody.seller_warehouse_id,
  );

  TestValidator.equals(
    "inventory adjustment reason id matches created reason id",
    adjustment.inventory_adjustment_reason_id,
    adjustmentCreateBody.inventory_adjustment_reason_id,
  );

  TestValidator.equals(
    "inventory adjustment direction echoes the requested decrease direction",
    adjustment.direction,
    adjustmentCreateBody.direction,
  );

  TestValidator.equals(
    "inventory adjustment quantity_delta echoes the negative delta",
    adjustment.quantity_delta,
    adjustmentCreateBody.quantity_delta,
  );
}
