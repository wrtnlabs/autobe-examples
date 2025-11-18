import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAnalyticsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDateRange";
import type { IAnalyticsPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsPagination";
import type { IAnalyticsSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsSort";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAdjustment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPeriod";
import type { IShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustment";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallInventoryAdjustmentReasonAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReasonAnalytics";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryAdjustmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryAdjustmentAnalytics";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWarehouseInventoryAdjustmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouseInventoryAdjustmentAnalytics";

export async function test_api_admin_seller_inventory_adjustment_analytics_multi_dimension_grouping(
  connection: api.IConnection,
) {
  // 1. Admin join (creates admin and authenticates)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join (creates seller and authenticates)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 3. Seller: create product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TEST_BRAND",
    model_name: "MODEL-1",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // We need an inventory state id but there is no creation API; use a random uuid.
  const inventoryStateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-2. Seller: create two SKUs for the product
  const sku1Body = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 100,
    low_stock_threshold: 10,
    shopping_mall_sku_inventory_state_id: inventoryStateId,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2Body = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 200,
    original_price: 220,
    inventory_quantity: 50,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryStateId,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 3-3. Seller: create two warehouses
  const warehouseMainBody = {
    code: `MAIN-${RandomGenerator.alphaNumeric(4)}`,
    name: "MAIN_DC",
    description: "Main distribution center",
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseMain: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseMainBody,
      },
    );
  typia.assert(warehouseMain);

  const warehouseReturnsBody = {
    code: `RET-${RandomGenerator.alphaNumeric(4)}`,
    name: "RETURNS_DC",
    description: "Returns distribution center",
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseReturns: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseReturnsBody,
      },
    );
  typia.assert(warehouseReturns);

  // 4. Switch back to admin context explicitly via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Admin: create two inventory adjustment reasons
  const damageReasonBody = {
    code: `DAMAGE-${RandomGenerator.alphaNumeric(4)}`,
    name: "DAMAGE",
    description: "Stock damaged in warehouse",
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const damageReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: damageReasonBody,
      },
    );
  typia.assert(damageReason);

  const correctionReasonBody = {
    code: `CORR-${RandomGenerator.alphaNumeric(4)}`,
    name: "CORRECTION",
    description: "Stock correction after count",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const correctionReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: correctionReasonBody,
      },
    );
  typia.assert(correctionReason);

  // 6. Admin: create multiple inventory adjustments across days, reasons, warehouses, SKUs
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const occurredYesterday = new Date(now.getTime() - oneDayMs).toISOString();
  const occurredToday = now.toISOString();

  type CreatedAdjustment = {
    record: IShoppingMallInventoryAdjustment;
  };

  const createdAdjustments: CreatedAdjustment[] = [];

  async function createAdjustment(
    skuId: string & tags.Format<"uuid">,
    warehouseId: string & tags.Format<"uuid">,
    reasonId: string & tags.Format<"uuid">,
    direction: string,
    quantityDelta: number,
    occurredAt: string & tags.Format<"date-time">,
  ): Promise<void> {
    const body = {
      seller_id: sellerId as string & tags.Format<"uuid">,
      sku_id: skuId,
      seller_warehouse_id: warehouseId,
      inventory_adjustment_reason_id: reasonId,
      direction,
      quantity_delta: quantityDelta,
      reference_type: null,
      reference_id: null,
      note: null,
      occurred_at: occurredAt,
    } satisfies IShoppingMallInventoryAdjustment.ICreate;

    const record: IShoppingMallInventoryAdjustment =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    typia.assert(record);
    createdAdjustments.push({ record });
  }

  // DAMAGE decreases on MAIN_DC for sku1 and sku2 (different days)
  await createAdjustment(
    sku1.id as string & tags.Format<"uuid">,
    warehouseMain.id as string & tags.Format<"uuid">,
    damageReason.id as string & tags.Format<"uuid">,
    "decrease",
    -5,
    occurredYesterday as string & tags.Format<"date-time">,
  );

  await createAdjustment(
    sku2.id as string & tags.Format<"uuid">,
    warehouseMain.id as string & tags.Format<"uuid">,
    damageReason.id as string & tags.Format<"uuid">,
    "decrease",
    -3,
    occurredToday as string & tags.Format<"date-time">,
  );

  // CORRECTION increases on RETURNS_DC for sku1 and sku2 (different days)
  await createAdjustment(
    sku1.id as string & tags.Format<"uuid">,
    warehouseReturns.id as string & tags.Format<"uuid">,
    correctionReason.id as string & tags.Format<"uuid">,
    "increase",
    7,
    occurredYesterday as string & tags.Format<"date-time">,
  );

  await createAdjustment(
    sku2.id as string & tags.Format<"uuid">,
    warehouseReturns.id as string & tags.Format<"uuid">,
    correctionReason.id as string & tags.Format<"uuid">,
    "increase",
    4,
    occurredToday as string & tags.Format<"date-time">,
  );

  // 7. Admin: query inventory adjustment analytics with multi-dimensional grouping
  const earliestOccurredAt = occurredYesterday;
  const latestOccurredAt = occurredToday;

  const dateRange: IAnalyticsDateRange = {
    from: earliestOccurredAt as string & tags.Format<"date-time">,
    to: latestOccurredAt as string & tags.Format<"date-time">,
  };

  const pagination: IAnalyticsPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    size: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    cursor: undefined,
  };

  const sortByNetChange: IAnalyticsSort = {
    field: "netQuantityChange",
    direction: "desc",
  } satisfies IAnalyticsSort;

  const analyticsRequest: IShoppingMallInventoryAdjustment.IRequest = {
    date_range: dateRange,
    seller_ids: [sellerId as string & tags.Format<"uuid">],
    sku_ids: undefined,
    seller_warehouse_ids: undefined,
    inventory_adjustment_reason_ids: undefined,
    directions: undefined,
    group_by: ["period", "reason", "warehouse", "sku"],
    metrics: undefined,
    pagination,
    sorts: [sortByNetChange],
  };

  const analyticsPage: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analyticsPage);

  const summaries = analyticsPage.data;

  TestValidator.predicate(
    "analytics should return at least one summary row",
    summaries.length > 0,
  );

  // 8. Validate metrics: ensure both increases and decreases appear across summaries
  let hasIncrease = false;
  let hasDecrease = false;

  let aggregatedNetChange = 0;

  let hasNonEmptyTopReasons = false;
  let hasNonEmptyTopSkus = false;
  let hasNonEmptyTopWarehouses = false;

  for (const summary of summaries) {
    aggregatedNetChange += summary.netQuantityChange;

    if (summary.totalIncreaseQuantity > 0) hasIncrease = true;
    if (summary.totalDecreaseQuantity > 0) hasDecrease = true;

    TestValidator.predicate(
      "summary should have non-negative adjustment count",
      summary.totalAdjustmentCount >= 0,
    );

    if (summary.topReasons.length > 0) hasNonEmptyTopReasons = true;
    if (summary.topSkus.length > 0) hasNonEmptyTopSkus = true;
    if (summary.topWarehouses.length > 0) hasNonEmptyTopWarehouses = true;
  }

  TestValidator.predicate(
    "analytics should include positive increase quantities",
    hasIncrease,
  );
  TestValidator.predicate(
    "analytics should include positive decrease quantities",
    hasDecrease,
  );

  TestValidator.predicate(
    "analytics should expose at least one top reason",
    hasNonEmptyTopReasons,
  );
  TestValidator.predicate(
    "analytics should expose at least one top SKU",
    hasNonEmptyTopSkus,
  );
  TestValidator.predicate(
    "analytics should expose at least one top warehouse",
    hasNonEmptyTopWarehouses,
  );

  // Compare aggregated net change from analytics with sum of raw adjustments
  const rawNetChange = createdAdjustments.reduce((acc, { record }) => {
    return acc + record.quantity_delta;
  }, 0);

  TestValidator.equals(
    "aggregated net quantity change should match sum of raw adjustments",
    aggregatedNetChange,
    rawNetChange,
  );
}
