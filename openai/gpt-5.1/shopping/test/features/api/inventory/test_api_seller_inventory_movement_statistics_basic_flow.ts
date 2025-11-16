import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryMovementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryMovementStatistics";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovement";
import type { IShoppingMallInventoryMovementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovementStatistics";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_inventory_movement_statistics_basic_flow(
  connection: api.IConnection,
) {
  /** 1. Join as a seller so that subsequent seller-scoped calls are authenticated. */
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  /** 2. Create a base product owned by this seller. */
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert<IShoppingMallProduct>(product);

  /** 3. Define an option type for the product (e.g., Color). */
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  /** 4. Define a single option value (e.g., Red) for the option type. */
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  /** 5. Create a SKU under that product. */
  const skuCode: string = `${productCode}-RED-001`;
  const skuCreateBody = {
    code: skuCode,
    name: "Red Variant",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  /** 6. Create an inventory item for the SKU with a known initial on-hand quantity. */
  const initialOnHand = 100 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: initialOnHand,
    low_stock_threshold: 10 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  /**
   * 7. Create several inventory movements for this inventory item. We will craft:
   *
   *    - Inbound +5 (restock)
   *    - Inbound +10 (restock)
   *    - Outbound -3 (manual_adjustment) So expected aggregates:
   *         total_inbound_quantity = 5 + 10 = 15 total_outbound_quantity = 3
   *         net_change_quantity = 12 movement_count = 3
   */
  const inventoryItemId = inventoryItem.id as string & tags.Format<"uuid">;

  const inboundQty1 = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const inboundQty2 = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const outboundQty = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const movementBodies: IShoppingMallInventoryMovement.ICreate[] = [
    {
      direction: "increase",
      quantity: inboundQty1,
      movementType: "restock",
      reason: "initial restock",
      order_id: null,
      order_line_id: null,
      reservation_id: null,
    },
    {
      direction: "increase",
      quantity: inboundQty2,
      movementType: "restock",
      reason: "second restock",
      order_id: null,
      order_line_id: null,
      reservation_id: null,
    },
    {
      direction: "decrease",
      quantity: outboundQty,
      movementType: "manual_adjustment",
      reason: "damage writeoff",
      order_id: null,
      order_line_id: null,
      reservation_id: null,
    },
  ] satisfies IShoppingMallInventoryMovement.ICreate[];

  const movements: IShoppingMallInventoryMovement[] = [];
  for (const body of movementBodies) {
    const movement =
      await api.functional.shoppingMall.seller.inventoryItems.movements.create(
        connection,
        {
          inventoryItemId,
          body,
        },
      );
    typia.assert<IShoppingMallInventoryMovement>(movement);
    movements.push(movement);
  }

  const expectedTotalInbound = inboundQty1 + inboundQty2;
  const expectedTotalOutbound = outboundQty;
  const expectedNetChange = expectedTotalInbound - expectedTotalOutbound;
  const expectedMovementCount = movements.length;

  /** 8. Prepare statistics request body with sku_ids and date range covering now. */
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const dateFrom = new Date(now.getTime() - dayMs).toISOString();
  const dateTo = new Date(now.getTime() + dayMs).toISOString();

  const statsRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sku_ids: [sku.id],
    product_ids: [product.id],
    seller_ids: undefined,
    warehouse_ids: undefined,
    movement_types: undefined,
    date_from: dateFrom,
    date_to: dateTo,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  const page: IPageIShoppingMallInventoryMovementStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.movements.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallInventoryMovementStatistics>(page);

  /** 9. Basic response shape validation: non-empty data and at least one record. */
  TestValidator.predicate(
    "statistics query should return at least one record",
    page.pagination.records > 0 && page.data.length > 0,
  );

  /** 10. Find statistics entry corresponding to our test SKU. */
  const statsForSku = page.data.find((s) => s.sku_id === sku.id);
  TestValidator.predicate(
    "statistics for created SKU should exist",
    statsForSku !== undefined,
  );

  if (!statsForSku) {
    return;
  }

  /** 11. Assert aggregated quantities match expectations. */
  TestValidator.equals(
    "total inbound quantity should match sum of inbound movements",
    statsForSku.total_inbound_quantity,
    expectedTotalInbound,
  );

  TestValidator.equals(
    "total outbound quantity should match sum of outbound movements",
    statsForSku.total_outbound_quantity,
    expectedTotalOutbound,
  );

  TestValidator.equals(
    "net change quantity should equal inbound - outbound",
    statsForSku.net_change_quantity,
    expectedNetChange,
  );

  TestValidator.equals(
    "movement count should equal number of movements created",
    statsForSku.movement_count,
    expectedMovementCount,
  );

  /**
   * 12. Ensure no unrelated statistics rows are returned when filtering by sku_ids.
   *     Since we passed only one sku_id, all rows must have that sku_id.
   */
  const allSkuIdsMatch = page.data.every((s) => s.sku_id === sku.id);
  TestValidator.predicate(
    "all statistics rows should correspond to requested sku_id",
    allSkuIdsMatch,
  );
}
