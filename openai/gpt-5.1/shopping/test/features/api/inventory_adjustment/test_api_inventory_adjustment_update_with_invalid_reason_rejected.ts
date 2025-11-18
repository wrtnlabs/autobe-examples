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
 * Validate that updating an inventory adjustment with a non-existent reason is
 * rejected.
 *
 * This scenario walks through a realistic admin and seller workflow to set up
 * all required inventory context and then attempts an invalid update:
 *
 * 1. Admin joins (registers) and implicitly authenticates.
 * 2. Admin creates a category to represent catalog taxonomy (context only).
 * 3. Seller joins and implicitly authenticates.
 * 4. Admin creates an inventory state that SKUs will reference.
 * 5. Seller creates a warehouse.
 * 6. Seller creates a product.
 * 7. Seller creates a SKU for that product using the admin-created inventory
 *    state.
 * 8. Admin creates a valid inventory adjustment reason.
 * 9. Admin creates a valid inventory adjustment referencing seller, sku,
 *    warehouse, and the reason.
 * 10. Admin attempts to update that inventory adjustment with an IUpdate payload
 *     whose inventory_adjustment_reason_id is a random UUID not associated with
 *     any reason.
 * 11. The update must fail (business rule / referential integrity), and
 *     TestValidator.error is used to assert that an error is thrown, without
 *     relying on specific status codes.
 */
export async function test_api_inventory_adjustment_update_with_invalid_reason_rejected(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a category (taxonomy context)
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller joins
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
  typia.assert(sellerAuthorized);

  // 4. Admin creates an inventory state
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 5. Seller creates a warehouse
  const sellerWarehouseBody = {
    code: `wh-${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: sellerWarehouseBody },
    );
  typia.assert(warehouse);

  // 6. Seller creates a product
  const productBody = {
    code: `prod-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Seller creates a SKU for that product
  const skuBody = {
    code: `sku-${RandomGenerator.alphabets(8)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 50,
    low_stock_threshold: 5,
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

  // 8. Admin creates a valid inventory adjustment reason
  const reasonBody = {
    code: `reason-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 9. Admin creates a valid inventory adjustment
  const adjustmentBody = {
    seller_id: sellerAuthorized.id,
    sku_id: sku.id,
    seller_warehouse_id: warehouse.id,
    inventory_adjustment_reason_id: reason.id,
    direction: reason.direction,
    quantity_delta: 10,
    reference_type: "manual_correction",
    reference_id: `ref-${RandomGenerator.alphabets(6)}`,
    note: RandomGenerator.paragraph({ sentences: 3 }),
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallInventoryAdjustment.ICreate;

  const adjustment: IShoppingMallInventoryAdjustment =
    await api.functional.shoppingMall.admin.inventoryAdjustments.create(
      connection,
      { body: adjustmentBody },
    );
  typia.assert(adjustment);

  // 10. Generate a random non-existent inventory_adjustment_reason_id
  const nonExistentReasonId = typia.random<string & tags.Format<"uuid">>();

  // 11. Attempt invalid update and assert error
  await TestValidator.error(
    "updating inventory adjustment with non-existent reason must fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustments.update(
        connection,
        {
          inventoryAdjustmentId: adjustment.id,
          body: {
            inventory_adjustment_reason_id: nonExistentReasonId,
            note: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallInventoryAdjustment.IUpdate,
        },
      );
    },
  );
}
