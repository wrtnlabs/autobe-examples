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

export async function test_api_inventory_adjustment_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins to own products, SKUs, and warehouses
  const sellerEmail = `${RandomGenerator.alphabets(8)}@seller.example.com`;

  const sellerJoinBody = {
    email: sellerEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
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

  // 3. As admin, create a SKU inventory state
  const skuInventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 4. As seller, create a seller warehouse
  const sellerWarehouseBody = {
    code: `wh_${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const sellerWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: sellerWarehouseBody,
      },
    );
  typia.assert(sellerWarehouse);

  // 5. As seller, create a product
  const productBody = {
    code: `prod_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
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

  // 5b. Under the product, create a SKU wired to the inventory state
  const skuBody = {
    code: `sku_${RandomGenerator.alphabets(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 100,
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

  // 6. As admin, create an inventory adjustment reason
  const reasonBody = {
    code: `reason_${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(reason);

  // 7. As admin, create multiple inventory adjustments with varying directions and occurred_at
  const baseOccurredAt = new Date();

  const adjustmentsToCreate: IShoppingMallInventoryAdjustment.ICreate[] = [
    {
      seller_id: sellerAuthorized.id,
      sku_id: sku.id,
      seller_warehouse_id: sellerWarehouse.id,
      inventory_adjustment_reason_id: reason.id,
      direction: "increase",
      quantity_delta: 10,
      reference_type: "initial_stock",
      reference_id: "ref-1",
      note: "Initial stock up",
      occurred_at: new Date(
        baseOccurredAt.getTime() - 3 * 60 * 60 * 1000,
      ).toISOString(),
    },
    {
      seller_id: sellerAuthorized.id,
      sku_id: sku.id,
      seller_warehouse_id: sellerWarehouse.id,
      inventory_adjustment_reason_id: reason.id,
      direction: "decrease",
      quantity_delta: -5,
      reference_type: "correction",
      reference_id: "ref-2",
      note: "Correction down",
      occurred_at: new Date(
        baseOccurredAt.getTime() - 2 * 60 * 60 * 1000,
      ).toISOString(),
    },
    {
      seller_id: sellerAuthorized.id,
      sku_id: sku.id,
      seller_warehouse_id: sellerWarehouse.id,
      inventory_adjustment_reason_id: reason.id,
      direction: "increase",
      quantity_delta: 3,
      reference_type: "correction",
      reference_id: "ref-3",
      note: "Correction up",
      occurred_at: new Date(
        baseOccurredAt.getTime() - 1 * 60 * 60 * 1000,
      ).toISOString(),
    },
  ];

  const createdAdjustments: IShoppingMallInventoryAdjustment[] = [];

  for (const body of adjustmentsToCreate) {
    const created =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);
    createdAdjustments.push(created);
  }

  // 8. Build search request with date_range and basic filters
  const occurredTimes = createdAdjustments.map((adj) =>
    new Date(adj.occurred_at).getTime(),
  );
  const minOccurred = new Date(Math.min(...occurredTimes)).toISOString();
  const maxOccurred = new Date(Math.max(...occurredTimes)).toISOString();

  const dateRange: IAnalyticsDateRange = {
    from: minOccurred,
    to: maxOccurred,
  };

  const pagination: IAnalyticsPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    size: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    cursor: undefined,
  };

  const sorts: IAnalyticsSort[] = [
    {
      field: "occurred_at",
      direction: "desc",
    },
  ];

  const requestBody: IShoppingMallInventoryAdjustment.IRequest = {
    date_range: dateRange,
    seller_ids: [sellerAuthorized.id],
    sku_ids: [sku.id],
    seller_warehouse_ids: [sellerWarehouse.id],
    inventory_adjustment_reason_ids: [reason.id],
    directions: undefined,
    group_by: undefined,
    metrics: undefined,
    pagination,
    sorts,
  };

  // 9. Call search endpoint and validate pagination and basic shape
  const page: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustments.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  const paginationInfo = page.pagination;

  TestValidator.equals(
    "pagination limit matches requested size",
    paginationInfo.limit,
    pagination.size,
  );

  TestValidator.equals(
    "current page matches requested page",
    paginationInfo.current,
    pagination.page,
  );

  TestValidator.predicate(
    "records count is non-negative and not less than data length",
    paginationInfo.records >= 0 &&
      paginationInfo.records >= (page.data?.length ?? 0),
  );

  // Basic sanity: all summaries must have a seller summary, as this is
  // seller-level analytics; we rely on typia.assert for deep type checks.
  for (const summary of page.data) {
    typia.assert(summary);
    TestValidator.predicate("summary has a seller object", !!summary.seller);
  }
}
