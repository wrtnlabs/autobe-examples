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
 * Validate that an authenticated admin can update metadata fields of an
 * inventory adjustment while preserving immutable quantitative and
 * ownership-related fields.
 *
 * Business flow:
 *
 * 1. Register and login an admin (admin actor).
 * 2. Register and login a seller (seller actor).
 * 3. As the seller, create a seller warehouse.
 * 4. As the admin, create an inventory state configuration.
 * 5. As the seller, create a product.
 * 6. As the seller, create a SKU under that product, referencing the inventory
 *    state.
 * 7. As the admin, create an inventory adjustment for the seller's SKU and
 *    warehouse.
 * 8. As the admin, update mutable metadata fields of that adjustment using
 *    IShoppingMallInventoryAdjustment.IUpdate.
 * 9. Verify that:
 *
 *    - Metadata fields are updated.
 *    - Immutable fields (id, seller_id, sku_id, seller_warehouse_id, quantity_delta)
 *         remain the same.
 *    - Updated_at has changed.
 */
export async function test_api_inventory_adjustment_update_metadata_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  TestValidator.predicate(
    "admin email should match join email",
    adminAuthorized.email === adminJoinBody.email,
  );

  // 2. Register and login a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  TestValidator.predicate(
    "seller email should match join email",
    sellerAuthorized.email === sellerJoinBody.email,
  );

  // 3. As the seller, create a seller warehouse
  const sellerWarehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: sellerWarehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouse);

  // 4. Switch back to admin context by logging in as admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 5. As admin, create a SKU inventory state
  const inventoryStateBody = {
    code: `INV-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 6. Switch to seller context again to create product and SKU
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 7. (Optional) Create a category to give product context (admin context)
  const adminLoginForCategory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForCategory);

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 8. Switch again to seller to create product and SKU
  const sellerLoggedInForProduct: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedInForProduct);

  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri:
      "https://images.example.com/product-primary.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 9. Switch to admin for inventory adjustment operations
  const adminLoggedInForAdjustment: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedInForAdjustment);

  // Create inventory adjustment reason
  const reasonBody = {
    code: `REASON-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
  typia.assert<IShoppingMallInventoryAdjustmentReason>(reason);

  // 10. Create base inventory adjustment (using correct seller_id)
  const occurredAtInitial = new Date().toISOString();
  const quantityDelta = 10;

  const adjustmentCreateBody = {
    seller_id: sellerLoggedInForProduct.id,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: reason.id,
    direction: reason.direction,
    quantity_delta: quantityDelta,
    reference_type: "initial_import",
    reference_id: RandomGenerator.alphaNumeric(12),
    note: RandomGenerator.paragraph({ sentences: 6 }),
    occurred_at: occurredAtInitial as string & tags.Format<"date-time">,
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const createdAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      {
        body: adjustmentCreateBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustment>(createdAdjustment);

  // 11. Prepare update payload with changed metadata fields
  const newReasonBody = {
    code: `REASON-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const newReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: newReasonBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(newReason);

  const occurredAtUpdated = new Date(Date.now() + 60_000).toISOString();

  const updateBody = {
    direction: newReason.direction,
    inventory_adjustment_reason_id: newReason.id,
    reference_type: "reclassification",
    reference_id: RandomGenerator.alphaNumeric(16),
    note: RandomGenerator.paragraph({ sentences: 5 }),
    occurred_at: occurredAtUpdated as string & tags.Format<"date-time">,
  } satisfies IShoppingMallInventoryAdjustment.IUpdate;

  const updatedAdjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.update(
      connection,
      {
        inventoryAdjustmentId: createdAdjustment.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustment>(updatedAdjustment);

  // 12. Validate immutable core fields remain the same
  TestValidator.equals(
    "inventory adjustment id should be unchanged",
    updatedAdjustment.id,
    createdAdjustment.id,
  );

  TestValidator.equals(
    "seller_id should be unchanged",
    updatedAdjustment.seller_id,
    createdAdjustment.seller_id,
  );

  TestValidator.equals(
    "sku_id should be unchanged",
    updatedAdjustment.sku_id,
    createdAdjustment.sku_id,
  );

  TestValidator.equals(
    "seller_warehouse_id should be unchanged",
    updatedAdjustment.seller_warehouse_id,
    createdAdjustment.seller_warehouse_id,
  );

  TestValidator.equals(
    "quantity_delta should be unchanged",
    updatedAdjustment.quantity_delta,
    createdAdjustment.quantity_delta,
  );

  // 13. Validate metadata fields updated as expected
  TestValidator.equals(
    "direction should be updated to new value",
    updatedAdjustment.direction,
    updateBody.direction,
  );

  TestValidator.equals(
    "inventory_adjustment_reason_id should be updated",
    updatedAdjustment.inventory_adjustment_reason_id,
    updateBody.inventory_adjustment_reason_id,
  );

  TestValidator.equals(
    "reference_type should be updated",
    updatedAdjustment.reference_type,
    updateBody.reference_type,
  );

  TestValidator.equals(
    "reference_id should be updated",
    updatedAdjustment.reference_id,
    updateBody.reference_id,
  );

  TestValidator.equals(
    "note should be updated",
    updatedAdjustment.note,
    updateBody.note,
  );

  TestValidator.equals(
    "occurred_at should be updated",
    updatedAdjustment.occurred_at,
    updateBody.occurred_at,
  );

  // 14. updated_at should change after the update
  TestValidator.notEquals(
    "updated_at should change after metadata update",
    updatedAdjustment.updated_at,
    createdAdjustment.updated_at,
  );
}
