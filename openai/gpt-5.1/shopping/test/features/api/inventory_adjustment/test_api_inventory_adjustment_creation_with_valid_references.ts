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
 * Validate creation of an inventory adjustment with fully valid references.
 *
 * Business flow:
 *
 * - An admin actor configures category, SKU inventory state, and inventory
 *   adjustment reason.
 * - A seller actor owns a product, a SKU that uses the configured inventory
 *   state, and a seller warehouse.
 * - The admin then records an inventory adjustment for that seller+SKU+warehouse
 *   using the created reason.
 *
 * Steps:
 *
 * 1. Admin join (creates admin and gives tokens implicitly).
 * 2. (Optional but realistic) Admin login using the same credentials to validate
 *    login flow and ensure admin context.
 * 3. Admin creates a category for product taxonomy.
 * 4. Admin creates a SKU inventory state (e.g. code "in_stock", is_purchasable
 *    true).
 * 5. Admin creates an inventory adjustment reason with direction "increase" and
 *    code like "STOCK_CORRECTION".
 * 6. Seller join (seller account + initial token).
 * 7. Seller login using same credentials to ensure seller context is active.
 * 8. Seller creates a product under some basic details.
 * 9. Seller creates a SKU under that product, pointing its
 *    shopping_mall_sku_inventory_state_id to the admin-created inventory state,
 *    with positive price and inventory_quantity.
 * 10. Seller creates a seller warehouse with is_default_origin true and active
 *     status.
 * 11. Switch context back to admin (login again) so that subsequent calls are as
 *     admin.
 * 12. Admin calls POST /shoppingMall/admin/inventoryAdjustments with an
 *     IShoppingMallInventoryAdjustment.ICreate body:
 *
 *     - Seller_id is taken from the seller authorized object (seller.id).
 *     - Sku_id from the created SKU.id.
 *     - Seller_warehouse_id from the warehouse.id.
 *     - Inventory_adjustment_reason_id from the created reason.id.
 *     - Direction aligned with reason.direction ("increase").
 *     - Quantity_delta = +5 to represent a stock increase.
 *     - Reference_type/reference_id and note filled with random but consistent
 *           strings.
 *     - Occurred_at set to a recent ISO timestamp via new Date().toISOString().
 * 13. Assert that the returned IShoppingMallInventoryAdjustment passes typia.assert
 *     and that core fields echo the request: seller_id, sku_id,
 *     seller_warehouse_id, inventory_adjustment_reason_id, direction,
 *     quantity_delta, occurred_at, reference_type, reference_id, note.
 * 14. Additionally, verify that id, created_at, and updated_at are populated
 *     (non-empty strings) and that the seller_id in the response equals the
 *     seller.id captured earlier.
 */
export async function test_api_inventory_adjustment_creation_with_valid_references(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Admin login (ensure context)
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

  // 3. Admin creates category
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Admin creates SKU inventory state (in_stock, purchasable)
  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "SKU is available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert(skuInventoryState);

  // 5. Admin creates inventory adjustment reason (increase)
  const adjustmentReasonBody = {
    code: `STOCK_CORRECTION_${RandomGenerator.alphaNumeric(6)}`,
    name: "Stock correction increase",
    description: "Manual correction increasing stock",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const adjustmentReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: adjustmentReasonBody },
    );
  typia.assert(adjustmentReason);

  // 6. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerId = sellerJoin.id;

  // 7. Seller login (ensure seller context is active)
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

  // 8. Seller creates product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 9. Seller creates SKU under the product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 10. Seller creates warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Warehouse",
    description: "Primary seller warehouse",
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: warehouseBody },
    );
  typia.assert(warehouse);

  // 11. Switch back to admin context via login
  const adminReLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLogin);

  // 12. Admin creates inventory adjustment
  const occurredAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const quantityDelta = 5;

  const referenceType = "manual_correction";
  const referenceId = `REF-${RandomGenerator.alphaNumeric(10)}`;
  const note = RandomGenerator.paragraph({ sentences: 5 });

  const adjustmentBody = {
    seller_id: sellerId,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: adjustmentReason.id,
    direction: adjustmentReason.direction,
    quantity_delta: quantityDelta,
    reference_type: referenceType,
    reference_id: referenceId,
    note,
    occurred_at: occurredAt,
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const adjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      { body: adjustmentBody },
    );
  typia.assert(adjustment);

  // 13. Core field validations
  TestValidator.equals(
    "seller_id should match sellerJoin.id",
    adjustment.seller_id,
    sellerId,
  );
  TestValidator.equals(
    "sku_id should match created sku.id",
    adjustment.sku_id,
    sku.id,
  );
  TestValidator.equals(
    "seller_warehouse_id should match created warehouse.id",
    adjustment.seller_warehouse_id,
    warehouse.id,
  );
  TestValidator.equals(
    "inventory_adjustment_reason_id should match created reason.id",
    adjustment.inventory_adjustment_reason_id,
    adjustmentReason.id,
  );
  TestValidator.equals(
    "direction should echo request direction",
    adjustment.direction,
    adjustmentBody.direction,
  );
  TestValidator.equals(
    "quantity_delta should echo request quantity_delta",
    adjustment.quantity_delta,
    quantityDelta,
  );
  TestValidator.equals(
    "occurred_at should echo request occurred_at",
    adjustment.occurred_at,
    occurredAt,
  );
  TestValidator.equals(
    "reference_type should echo request reference_type",
    adjustment.reference_type,
    referenceType,
  );
  TestValidator.equals(
    "reference_id should echo request reference_id",
    adjustment.reference_id,
    referenceId,
  );
  TestValidator.equals("note should echo request note", adjustment.note, note);

  // 14. Ensure id, created_at, and updated_at are populated
  TestValidator.predicate(
    "adjustment.id must be a non-empty string",
    adjustment.id.length > 0,
  );
  TestValidator.predicate(
    "adjustment.created_at must be non-empty",
    adjustment.created_at.length > 0,
  );
  TestValidator.predicate(
    "adjustment.updated_at must be non-empty",
    adjustment.updated_at.length > 0,
  );
}
