import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovement";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that seller inventory movements cannot drive on-hand stock below
 * zero when backorders are disabled.
 *
 * Business goal: Ensure that the inventory movement creation endpoint enforces
 * the rule that an inventory item with `backorder_enabled=false` must never
 * result in a negative on-hand quantity, even if an operator attempts to create
 * a manual decreasing movement that would oversell stock.
 *
 * High-level flow:
 *
 * 1. Register a seller account and obtain an authenticated session.
 * 2. Create a multi-SKU product for that seller.
 * 3. Add a product option type and one option value to simulate a realistic
 *    catalog setup (even though the SKU creation DTO in this model does not
 *    directly reference option values).
 * 4. Create a SKU under the product.
 * 5. Create an inventory item for that SKU with a small positive
 *    `on_hand_quantity` (e.g. 1), `backorder_enabled=false`, and
 *    `preorder_enabled=false`.
 * 6. Attempt to post an inventory movement with `direction="decrease"` and
 *    `quantity` larger than the current `on_hand_quantity` (e.g. 2). Use
 *    `movementType="manual_adjustment"` and an optional `reason`.
 * 7. Expect the movement creation call to fail (throw HttpError) due to
 *    business-rule validation that prevents negative stock when backorders are
 *    disabled.
 *
 * Important constraints from the framework and SDK:
 *
 * - We must not check specific HTTP status codes or error payload structure;
 *   instead, we just assert that the call fails using TestValidator.error.
 * - We do not have any list/get endpoint for movements in the provided SDK, so we
 *   cannot assert absence of a newly created movement by reading movement
 *   history. The failure of the create() call itself is used as the proxy for:
 *   "no invalid movement was recorded".
 * - All request bodies must use the concrete ICreate/IRequest DTO variants with
 *   `satisfies`, and we must use `typia.assert()` on every successful response
 *   DTO to ensure complete type correctness.
 */
export async function test_api_inventory_movement_creation_validation_for_negative_stock(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create a product for this seller
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create an option type under the product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 4. Create an option value under that option type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 5. Create a SKU for the product
  const skuCode: string = `${product.code}-SKU1`;
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} Red Variant`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Create an inventory item with small on-hand quantity and backorder disabled
  const initialOnHandQuantity: number & tags.Type<"int32"> & tags.Minimum<0> =
    1;

  const inventoryItemCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: initialOnHandQuantity,
    low_stock_threshold: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryItemCreateBody,
    });
  typia.assert(inventoryItem);

  // 7. Attempt an oversell movement that would drive on-hand below zero
  const oversellQuantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2;

  const movementCreateBody = {
    direction: "decrease",
    quantity: oversellQuantity,
    movementType: "manual_adjustment",
    reason:
      "Test oversell movement should be rejected when backorder is disabled",
    order_id: null,
    order_line_id: null,
    reservation_id: null,
  } satisfies IShoppingMallInventoryMovement.ICreate;

  await TestValidator.error(
    "decrease below zero without backorder should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventoryItems.movements.create(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          body: movementCreateBody,
        },
      );
    },
  );
}
