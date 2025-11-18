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

export async function test_api_admin_seller_inventory_adjustment_analytics_basic_filtering(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain admin authentication
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins and logs in to create catalog and warehouse resources
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // explicit seller login (not strictly necessary but exercises login flow)
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const sellerId: string & tags.Format<"uuid"> = sellerLogin.id;

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Seller creates a warehouse
  const warehouseCreateBody = {
    code: "WH-" + RandomGenerator.alphaNumeric(6),
    name: "Primary Test Warehouse",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert(warehouse);

  // 5. Seller creates a SKU under the product
  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 0,
    low_stock_threshold: 0,
    shopping_mall_sku_inventory_state_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  const skuId: string & tags.Format<"uuid"> = sku.id;
  const warehouseId: string & tags.Format<"uuid"> = warehouse.id;

  // 6. Switch back to admin context (admin login) to create reasons and adjustments
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7. Admin creates an inventory adjustment reason
  const reasonCodeBase =
    "DAMAGE_" + RandomGenerator.alphaNumeric(6).toUpperCase();
  const reasonCreateBody = {
    code: reasonCodeBase,
    name: "Damage / Test Reason",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    direction: "decrease",
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

  const reasonId: string & tags.Format<"uuid"> = reason.id;

  // 8. Create multiple inventory adjustments with varying directions and quantities
  const now = new Date();
  const baseOccurredAt: string & tags.Format<"date-time"> = new Date(
    now.getTime() - 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 5 minutes ago

  type AdjustmentPlan = {
    quantity: number;
    direction: string;
    offsetMinutes: number;
  };

  const plans: AdjustmentPlan[] = [
    { quantity: 10, direction: "increase", offsetMinutes: -4 },
    { quantity: -3, direction: "decrease", offsetMinutes: -3 },
    { quantity: 5, direction: "increase", offsetMinutes: -2 },
    { quantity: -2, direction: "decrease", offsetMinutes: -1 },
  ];

  let expectedIncrease = 0;
  let expectedDecrease = 0;

  const createdAdjustments: IShoppingMallInventoryAdjustment[] = [];

  for (const plan of plans) {
    const occurredAtDate = new Date(
      now.getTime() + plan.offsetMinutes * 60 * 1000,
    );
    const occurredAt = occurredAtDate.toISOString() as string &
      tags.Format<"date-time">;

    const quantityDelta = plan.quantity;
    if (quantityDelta > 0) expectedIncrease += quantityDelta;
    else expectedDecrease += Math.abs(quantityDelta);

    const body = {
      seller_id: sellerId,
      sku_id: skuId,
      seller_warehouse_id: warehouseId,
      inventory_adjustment_reason_id: reasonId,
      direction: plan.direction,
      quantity_delta: quantityDelta,
      reference_type: "test_scenario",
      reference_id: "REF-" + RandomGenerator.alphaNumeric(8),
      note: "E2E analytics adjustment",
      occurred_at: occurredAt,
    } satisfies IShoppingMallInventoryAdjustment.ICreate;

    const created: IShoppingMallInventoryAdjustment =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdAdjustments.push(created);
  }

  const netExpected = expectedIncrease - expectedDecrease;

  // 9. Build analytics request body covering the date range and filters
  const analyticsFrom = new Date(
    now.getTime() - 30 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 30 minutes ago
  const analyticsTo = new Date(
    now.getTime() + 30 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 30 minutes in future

  const dateRange: IAnalyticsDateRange = {
    from: analyticsFrom,
    to: analyticsTo,
  };

  const pagination: IAnalyticsPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    size: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    cursor: undefined,
  };

  const sorts: IAnalyticsSort[] = [
    {
      field: "period",
      direction: "asc",
    },
  ];

  const analyticsRequestBody = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [skuId],
    seller_warehouse_ids: [warehouseId],
    inventory_adjustment_reason_ids: [reasonId],
    directions: ["increase", "decrease"],
    group_by: ["seller", "period"],
    metrics: [
      "totalAdjustmentCount",
      "totalIncreaseQuantity",
      "totalDecreaseQuantity",
      "netQuantityChange",
    ],
    pagination,
    sorts,
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  // 10. Call analytics endpoint
  const page: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(page);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.limit should be >= data length",
    page.pagination.limit >= page.data.length,
  );

  TestValidator.predicate(
    "pagination.records should be >= data length",
    page.pagination.records >= page.data.length,
  );

  // There should be at least one analytics row
  TestValidator.predicate(
    "analytics data should not be empty for the filtered scenario",
    page.data.length > 0,
  );

  // 11. Find summary row for the seller and validate aggregation semantics
  const sellerSummary = page.data.find((row) => row.seller.id === sellerId);
  TestValidator.predicate(
    "seller summary for created seller must exist",
    !!sellerSummary,
  );

  if (!sellerSummary) return;

  // Validate aggregate quantities
  TestValidator.equals(
    "totalIncreaseQuantity equals sum of positive quantity_delta",
    sellerSummary.totalIncreaseQuantity,
    expectedIncrease,
  );

  TestValidator.equals(
    "totalDecreaseQuantity equals sum of absolute negative quantity_delta",
    sellerSummary.totalDecreaseQuantity,
    expectedDecrease,
  );

  TestValidator.equals(
    "netQuantityChange equals increase minus decrease",
    sellerSummary.netQuantityChange,
    netExpected,
  );

  // 12. Validate topReasons includes our reason with compatible metrics
  const topReason = sellerSummary.topReasons.find(
    (r) => r.reason.id === reasonId,
  );

  TestValidator.predicate(
    "topReasons should include created reason",
    !!topReason,
  );

  if (topReason) {
    TestValidator.predicate(
      "topReason.adjustmentCount should be > 0",
      topReason.adjustmentCount > 0,
    );
    TestValidator.predicate(
      "topReason.netQuantityChange should be non-zero for our adjustments",
      topReason.netQuantityChange !== 0,
    );
  }

  // 13. Validate topSkus includes our SKU with compatible metrics
  const topSku = sellerSummary.topSkus.find((s) => s.sku.id === skuId);

  TestValidator.predicate("topSkus should include created SKU", !!topSku);

  if (topSku) {
    TestValidator.predicate(
      "topSku.adjustmentCount should be > 0",
      topSku.adjustmentCount > 0,
    );
    TestValidator.equals(
      "topSku.totalIncreaseQuantity should be >= expectedIncrease",
      topSku.totalIncreaseQuantity >= expectedIncrease,
      true,
    );
  }

  // 14. Validate topWarehouses includes our warehouse with compatible metrics
  const topWarehouse = sellerSummary.topWarehouses.find(
    (w) => w.warehouse.id === warehouseId,
  );

  TestValidator.predicate(
    "topWarehouses should include created warehouse",
    !!topWarehouse,
  );

  if (topWarehouse) {
    TestValidator.predicate(
      "topWarehouse.adjustmentCount should be > 0",
      topWarehouse.adjustmentCount > 0,
    );
    TestValidator.equals(
      "topWarehouse.totalIncreaseQuantity should be >= expectedIncrease",
      topWarehouse.totalIncreaseQuantity >= expectedIncrease,
      true,
    );
  }
}
