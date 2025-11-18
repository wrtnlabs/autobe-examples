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
 * Validate that an admin can retrieve full details of an inventory adjustment
 * when only minimal prerequisite entities exist.
 *
 * Business flow:
 *
 * 1. Admin joins (implicit login) to obtain admin authorization.
 * 2. Admin creates a root category (minimal catalog context).
 * 3. Admin creates an SKU inventory state (e.g., IN_STOCK) for SKU creation.
 * 4. Admin creates an inventory adjustment reason (e.g., STOCK_CORRECTION) with a
 *    concrete direction.
 * 5. Seller joins (implicit login) to obtain seller authorization.
 * 6. Seller creates a minimal product using only required
 *    IShoppingMallProduct.ICreate fields.
 * 7. Seller creates a SKU under that product with IShoppingMallSku.ICreate,
 *    referencing the inventory state and a small positive inventory_quantity.
 * 8. Seller creates a seller warehouse marked as default origin and active.
 * 9. Admin logs in again explicitly to ensure admin token is active on the
 *    connection.
 * 10. Admin creates an inventory adjustment referencing seller_id, sku_id,
 *     seller_warehouse_id, and inventory_adjustment_reason_id, with positive
 *     quantity_delta, a direction consistent with the reason, and recent
 *     occurred_at.
 * 11. Admin calls GET
 *     /shoppingMall/admin/inventoryAdjustments/{inventoryAdjustmentId}.
 * 12. Validate via typia.assert and TestValidator that the retrieved record matches
 *     the created one for all key fields, and that optional contextual fields
 *     either echo set values or are null.
 */
export async function test_api_inventory_adjustment_detail_by_admin_with_minimal_prerequisites(
  connection: api.IConnection,
) {
  // 1. Admin joins (implicit login)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    "Adm1nPassword!" as string & tags.Format<"password">;

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

  // 2. Admin creates a root category
  const categoryBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Admin creates an SKU inventory state
  const inventoryStateBody = {
    code: `IN_STOCK_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 4. Admin creates an inventory adjustment reason
  const directionValue = "increase";
  const reasonBody = {
    code: `STOCK_CORRECTION_${RandomGenerator.alphaNumeric(6)}`,
    name: "Stock Correction",
    description: RandomGenerator.paragraph({ sentences: 1 }),
    direction: directionValue,
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const adjustmentReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonBody,
      },
    );
  typia.assert(adjustmentReason);

  // 5. Seller joins (implicit login)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> =
    "Sell3rPassword!" as string & tags.Format<"password">;

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

  // 6. Seller creates a minimal product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
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

  // 7. Seller creates a SKU under the product
  const skuInitialInventory: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 1000,
    original_price: null,
    inventory_quantity: skuInitialInventory,
    low_stock_threshold: null,
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

  // 8. Seller creates a seller warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Origin Warehouse",
    description: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 9. Admin logs in explicitly to ensure admin token is on the connection
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/from-seller-flow",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 10. Admin creates an inventory adjustment
  const occurredAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const referenceType: string | null = "manual_correction";
  const referenceId: string | null = `REF-${RandomGenerator.alphaNumeric(8)}`;
  const note: string | null = RandomGenerator.paragraph({ sentences: 1 });

  const adjustmentCreateBody = {
    seller_id: sellerAuthorized.id,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: adjustmentReason.id,
    direction: directionValue,
    quantity_delta: 5,
    reference_type: referenceType,
    reference_id: referenceId,
    note,
    occurred_at: occurredAt,
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const createdAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      {
        body: adjustmentCreateBody,
      },
    );
  typia.assert(createdAdjustment);

  // 11. Admin retrieves the inventory adjustment detail via GET
  const fetchedAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.at(
      connection,
      {
        inventoryAdjustmentId: createdAdjustment.id,
      },
    );
  typia.assert(fetchedAdjustment);

  // 12. Validate key fields and consistency between created and fetched records
  TestValidator.equals(
    "adjustment id should match",
    fetchedAdjustment.id,
    createdAdjustment.id,
  );

  TestValidator.equals(
    "seller id should match",
    fetchedAdjustment.seller_id,
    adjustmentCreateBody.seller_id,
  );

  TestValidator.equals(
    "sku id should match",
    fetchedAdjustment.sku_id,
    adjustmentCreateBody.sku_id,
  );

  TestValidator.equals(
    "seller warehouse id should match",
    fetchedAdjustment.seller_warehouse_id,
    adjustmentCreateBody.seller_warehouse_id,
  );

  TestValidator.equals(
    "inventory adjustment reason id should match",
    fetchedAdjustment.inventory_adjustment_reason_id,
    adjustmentCreateBody.inventory_adjustment_reason_id,
  );

  TestValidator.equals(
    "direction should match",
    fetchedAdjustment.direction,
    adjustmentCreateBody.direction,
  );

  TestValidator.equals(
    "quantity_delta should match",
    fetchedAdjustment.quantity_delta,
    adjustmentCreateBody.quantity_delta,
  );

  TestValidator.equals(
    "occurred_at should match",
    fetchedAdjustment.occurred_at,
    adjustmentCreateBody.occurred_at,
  );

  // created_at and updated_at should be present and valid ISO strings
  TestValidator.predicate(
    "created_at should be a non-empty ISO string",
    typeof fetchedAdjustment.created_at === "string" &&
      fetchedAdjustment.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty ISO string",
    typeof fetchedAdjustment.updated_at === "string" &&
      fetchedAdjustment.updated_at.length > 0,
  );

  // Optional contextual fields should echo creation values
  TestValidator.equals(
    "reference_type should match",
    fetchedAdjustment.reference_type ?? null,
    adjustmentCreateBody.reference_type ?? null,
  );

  TestValidator.equals(
    "reference_id should match",
    fetchedAdjustment.reference_id ?? null,
    adjustmentCreateBody.reference_id ?? null,
  );

  TestValidator.equals(
    "note should match",
    fetchedAdjustment.note ?? null,
    adjustmentCreateBody.note ?? null,
  );
}
