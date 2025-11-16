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

export async function test_api_seller_inventory_movement_statistics_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Seller joins (auth context for all subsequent calls)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create two products for this seller
  const baseProductCodeA = `PROD-A-${RandomGenerator.alphaNumeric(6)}`;
  const baseProductCodeB = `PROD-B-${RandomGenerator.alphaNumeric(6)}`;

  const productCreateBase = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies Omit<IShoppingMallProduct.ICreate, "code" | "name">;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        ...productCreateBase,
        code: baseProductCodeA,
        name: `Product A ${RandomGenerator.paragraph({ sentences: 1 })}`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        ...productCreateBase,
        code: baseProductCodeB,
        name: `Product B ${RandomGenerator.paragraph({ sentences: 1 })}`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productB);

  // 3. Define an option type and values to make SKUs realistic (single type/value per product)
  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: {
          name: "Color",
          display_name: "Color",
          display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IShoppingMallProductOptionType.ICreate,
      },
    );
  typia.assert(optionTypeA);

  const optionTypeB: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productB.code,
        body: {
          name: "Color",
          display_name: "Color",
          display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IShoppingMallProductOptionType.ICreate,
      },
    );
  typia.assert(optionTypeB);

  const optionValueA: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productA.code,
        productOptionTypeId: optionTypeA.id,
        body: {
          value: "RED",
          display_name: "Red",
          display_order: 0 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValueA);

  const optionValueB: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productB.code,
        productOptionTypeId: optionTypeB.id,
        body: {
          value: "BLUE",
          display_name: "Blue",
          display_order: 0 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValueB);

  // 4. Create one SKU per product
  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: {
        code: `SKU-A-${RandomGenerator.alphaNumeric(4)}`,
        name: "SKU A1",
        listPrice: 10000,
        salePrice: 9000,
        currency: "KRW",
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(skuA);

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: {
        code: `SKU-B-${RandomGenerator.alphaNumeric(4)}`,
        name: "SKU B1",
        listPrice: 15000,
        salePrice: 14000,
        currency: "KRW",
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(skuB);

  // 5. Create inventory items for each SKU
  const inventoryItemA: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: {
        product_sku_id: skuA.id,
        on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        backorder_enabled: false,
        preorder_enabled: false,
      } satisfies IShoppingMallInventoryItem.ICreate,
    });
  typia.assert(inventoryItemA);

  const inventoryItemB: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: {
        product_sku_id: skuB.id,
        on_hand_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
        backorder_enabled: false,
        preorder_enabled: false,
      } satisfies IShoppingMallInventoryItem.ICreate,
    });
  typia.assert(inventoryItemB);

  // Helper to generate a movement creation body
  const createMovement = async (
    inventoryItemId: string & tags.Format<"uuid">,
    direction: string,
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>,
    movementType: string,
    reason: string,
  ): Promise<IShoppingMallInventoryMovement> => {
    const body = {
      direction,
      quantity,
      movementType,
      reason,
      order_id: null,
      order_line_id: null,
      reservation_id: null,
    } satisfies IShoppingMallInventoryMovement.ICreate;

    const movement: IShoppingMallInventoryMovement =
      await api.functional.shoppingMall.seller.inventoryItems.movements.create(
        connection,
        {
          inventoryItemId,
          body,
        },
      );
    typia.assert(movement);
    return movement;
  };

  // 6. Create movements (backend sets created_at timestamps)
  const movementA1 = await createMovement(
    inventoryItemA.id,
    "increase",
    20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "inbound_restock",
    "Initial restock for SKU A",
  );
  const movementA2 = await createMovement(
    inventoryItemA.id,
    "decrease",
    5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "outbound_sale",
    "First sale of SKU A",
  );
  const movementA3 = await createMovement(
    inventoryItemA.id,
    "decrease",
    3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "outbound_sale",
    "Second sale of SKU A",
  );
  const movementA4 = await createMovement(
    inventoryItemA.id,
    "increase",
    2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "manual_adjustment",
    "Manual correction for SKU A",
  );

  const movementB1 = await createMovement(
    inventoryItemB.id,
    "increase",
    10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "inbound_restock",
    "Initial restock for SKU B",
  );
  const movementB2 = await createMovement(
    inventoryItemB.id,
    "decrease",
    4 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "outbound_sale",
    "First sale of SKU B",
  );

  // Derive a basic date range from created_at timestamps.
  const timestamps = [
    movementA1.created_at,
    movementA2.created_at,
    movementA3.created_at,
    movementA4.created_at,
    movementB1.created_at,
    movementB2.created_at,
  ];
  const sortedTimestamps = [...timestamps].sort();
  const midIndex = Math.floor(sortedTimestamps.length / 2);
  const dateFrom = sortedTimestamps[0];
  const dateToNarrow = sortedTimestamps[midIndex];
  const dateToWide = sortedTimestamps[sortedTimestamps.length - 1];

  // 7a. First statistics call: filter by SKU A with narrow date range and small limit
  const requestNarrow = {
    page: 1 as number & tags.Type<"int32">,
    limit: 1 as number & tags.Type<"int32">,
    sku_ids: [skuA.id],
    product_ids: undefined,
    seller_ids: undefined,
    warehouse_ids: undefined,
    movement_types: undefined,
    date_from: dateFrom,
    date_to: dateToNarrow,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  const statsNarrow: IPageIShoppingMallInventoryMovementStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.movements.index(
      connection,
      { body: requestNarrow },
    );
  typia.assert(statsNarrow);

  const paginationNarrow = statsNarrow.pagination;
  const dataNarrow = statsNarrow.data;

  // Basic pagination assertions
  TestValidator.equals(
    "narrow: limit matches request",
    requestNarrow.limit,
    paginationNarrow.limit,
  );
  TestValidator.predicate(
    "narrow: current page is non-negative",
    paginationNarrow.current >= 0,
  );
  TestValidator.predicate(
    "narrow: records non-negative",
    paginationNarrow.records >= 0,
  );
  TestValidator.predicate(
    "narrow: pages non-negative",
    paginationNarrow.pages >= 0,
  );
  TestValidator.predicate(
    "narrow: data length does not exceed limit",
    dataNarrow.length <= paginationNarrow.limit,
  );

  // Filter assertions: only SKU A and within date range
  for (const row of dataNarrow) {
    TestValidator.equals(
      "narrow: statistics row belongs to SKU A",
      skuA.id,
      row.sku_id,
    );
    TestValidator.predicate(
      "narrow: from_at within [date_from, date_to]",
      row.from_at >= requestNarrow.date_from! &&
        row.from_at <= requestNarrow.date_to!,
    );
    TestValidator.predicate(
      "narrow: to_at within [date_from, date_to]",
      row.to_at >= requestNarrow.date_from! &&
        row.to_at <= requestNarrow.date_to!,
    );
  }

  // 7b. Second statistics call: broaden filters to include both SKUs and wider date range
  const requestWide = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sku_ids: [skuA.id, skuB.id],
    product_ids: [productA.id, productB.id],
    seller_ids: undefined,
    warehouse_ids: undefined,
    movement_types: undefined,
    date_from: dateFrom,
    date_to: dateToWide,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  const statsWide: IPageIShoppingMallInventoryMovementStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.movements.index(
      connection,
      { body: requestWide },
    );
  typia.assert(statsWide);

  const paginationWide = statsWide.pagination;
  const dataWide = statsWide.data;

  TestValidator.equals(
    "wide: limit matches request",
    requestWide.limit,
    paginationWide.limit,
  );
  TestValidator.predicate(
    "wide: records >= narrow.records",
    paginationWide.records >= paginationNarrow.records,
  );
  TestValidator.predicate(
    "wide: data length does not exceed limit",
    dataWide.length <= paginationWide.limit,
  );

  const allowedSkuIds = new Set<string>([skuA.id, skuB.id]);
  for (const row of dataWide) {
    TestValidator.predicate(
      "wide: row sku_id is either SKU A or SKU B",
      allowedSkuIds.has(row.sku_id),
    );
    TestValidator.predicate(
      "wide: row date window within [dateFrom, dateToWide]",
      row.from_at >= requestWide.date_from! &&
        row.to_at <= requestWide.date_to!,
    );
  }

  // 7c. Third call: restrict by movement_types (only outbound_sale) for same SKU/date range
  const requestOutboundOnly = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sku_ids: [skuA.id],
    product_ids: [productA.id],
    seller_ids: undefined,
    warehouse_ids: undefined,
    movement_types: ["outbound_sale"],
    date_from: dateFrom,
    date_to: dateToWide,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  const statsOutboundOnly: IPageIShoppingMallInventoryMovementStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.movements.index(
      connection,
      { body: requestOutboundOnly },
    );
  typia.assert(statsOutboundOnly);

  const paginationOutbound = statsOutboundOnly.pagination;
  const dataOutbound = statsOutboundOnly.data;

  TestValidator.predicate(
    "outbound: data length does not exceed limit",
    dataOutbound.length <= paginationOutbound.limit,
  );

  // When we have both wide and outbound for same SKU/date range, outbound-only
  // movement_count should not exceed that of wide stats for same SKU if such
  // row exists. We'll compare per sku_id where matching rows are found.
  const wideBySku = new Map<string, IShoppingMallInventoryMovementStatistics>();
  for (const row of dataWide) {
    wideBySku.set(row.sku_id, row);
  }
  for (const row of dataOutbound) {
    const baseline = wideBySku.get(row.sku_id);
    if (baseline !== undefined) {
      TestValidator.predicate(
        "outbound: movement_count <= wide movement_count for same sku",
        row.movement_count <= baseline.movement_count,
      );
    }
  }

  // 8. Future-only date range should return empty result
  const futureFrom = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureTo = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const requestFuture = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sku_ids: [skuA.id, skuB.id],
    product_ids: [productA.id, productB.id],
    seller_ids: undefined,
    warehouse_ids: undefined,
    movement_types: undefined,
    date_from: futureFrom,
    date_to: futureTo,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  const statsFuture: IPageIShoppingMallInventoryMovementStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.movements.index(
      connection,
      { body: requestFuture },
    );
  typia.assert(statsFuture);

  TestValidator.equals("future: no records", 0, statsFuture.pagination.records);
  TestValidator.equals(
    "future: data array is empty",
    0,
    statsFuture.data.length,
  );
}
