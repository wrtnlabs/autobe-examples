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

export async function test_api_admin_seller_inventory_adjustment_analytics_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join and login (login not strictly necessary after join because join sets token, but we follow scenario dependencies)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Seller join and login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const sellerId: string & tags.Format<"uuid"> = sellerLoggedIn.id as string &
    tags.Format<"uuid">;

  // 3. As seller, create warehouse, product, and SKU
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product-primary.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: `BC-${RandomGenerator.alphaNumeric(10)}`,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // Switch back to admin (login again to ensure admin token in connection)
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 4. Admin creates an inventory adjustment reason
  const reasonBody = {
    code: `ADJ-${RandomGenerator.alphaNumeric(6)}`,
    name: "Bulk Test Adjustments",
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

  // 5. Admin generates many inventory adjustment events for this seller / SKU / warehouse / reason
  const totalAdjustments = 60;
  const now = new Date();
  const baseOccurredAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // one week ago

  const createAdjustmentAtIndex = async (
    index: number,
  ): Promise<IShoppingMallInventoryAdjustment> => {
    const occurredAtDate = new Date(
      baseOccurredAt.getTime() + index * 60 * 60 * 1000,
    );
    const occurredAt = occurredAtDate.toISOString() as string &
      tags.Format<"date-time">;

    const body = {
      seller_id: sellerId,
      sku_id: sku.id,
      seller_warehouse_id: warehouse.id,
      inventory_adjustment_reason_id: reason.id,
      direction: "increase",
      quantity_delta: 1,
      reference_type: "test_bulk_seed",
      reference_id: `ADJ-${index}`,
      note: `Seeded adjustment #${index}`,
      occurred_at: occurredAt,
    } satisfies IShoppingMallInventoryAdjustment.ICreate;

    const created: IShoppingMallInventoryAdjustment =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    return created;
  };

  const createdAdjustments: IShoppingMallInventoryAdjustment[] =
    await ArrayUtil.asyncRepeat<IShoppingMallInventoryAdjustment>(
      totalAdjustments,
      async (index) => {
        const created = await createAdjustmentAtIndex(index);
        typia.assert(created);
        return created;
      },
    );

  TestValidator.equals(
    "created adjustments count matches expected",
    createdAdjustments.length,
    totalAdjustments,
  );

  // 6. Call analytics with pagination page 1 size 20 sorted by period asc
  const dateRange: IAnalyticsDateRange = {
    from: baseOccurredAt.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
  };

  const paginationPage1: IAnalyticsPagination = {
    page: 1,
    size: 20,
  };

  const periodAscSort: IAnalyticsSort = {
    field: "period",
    direction: "asc",
  };

  const analyticsRequestPage1 = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [reason.id],
    directions: ["increase"],
    group_by: ["period"],
    metrics: [
      "totalAdjustmentCount",
      "totalIncreaseQuantity",
      "totalDecreaseQuantity",
      "netQuantityChange",
    ],
    pagination: paginationPage1,
    sorts: [periodAscSort],
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const page1: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: analyticsRequestPage1,
      },
    );
  typia.assert(page1);

  const page1Pagination: IPage.IPagination = page1.pagination;

  TestValidator.predicate(
    "page1 current page should be 1",
    page1Pagination.current === 1,
  );

  TestValidator.predicate(
    "page1 limit should be <= requested size",
    page1Pagination.limit <= (paginationPage1.size ?? 0),
  );

  TestValidator.predicate(
    "page1 data length should be <= limit",
    page1.data.length <= page1Pagination.limit,
  );

  TestValidator.predicate(
    "pagination pages should be > 1 due to many adjustments",
    page1Pagination.pages > 1,
  );

  TestValidator.predicate(
    "pagination records should be >= data length",
    page1Pagination.records >= page1.data.length,
  );

  // Verify ordering by period asc in first page
  const isPage1SortedByPeriodAsc = page1.data.every((row, index) => {
    if (index === 0) return true;
    const prev = page1.data[index - 1];
    const prevPeriod = prev.period;
    const currPeriod = row.period;
    // Compare by period.start then end
    if (prevPeriod.start < currPeriod.start) return true;
    if (prevPeriod.start > currPeriod.start) return false;
    return prevPeriod.end <= currPeriod.end;
  });

  TestValidator.predicate(
    "page1 summary rows sorted by period ascending",
    isPage1SortedByPeriodAsc,
  );

  // 7. Call analytics for page 2 with same filters
  const paginationPage2: IAnalyticsPagination = {
    page: 2,
    size: 20,
  };

  const analyticsRequestPage2 = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [reason.id],
    directions: ["increase"],
    group_by: ["period"],
    metrics: [
      "totalAdjustmentCount",
      "totalIncreaseQuantity",
      "totalDecreaseQuantity",
      "netQuantityChange",
    ],
    pagination: paginationPage2,
    sorts: [periodAscSort],
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const page2: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: analyticsRequestPage2,
      },
    );
  typia.assert(page2);

  const page2Pagination: IPage.IPagination = page2.pagination;

  TestValidator.predicate(
    "page2 current page should be 2",
    page2Pagination.current === 2,
  );

  TestValidator.predicate(
    "page2 data length should be <= limit",
    page2.data.length <= page2Pagination.limit,
  );

  // Ensure no overlapping summary rows between page1 and page2 by comparing serialized keys
  const serializeSummaryKey = (
    row: IShoppingMallInventoryAdjustment.ISummary,
  ): string => {
    const sellerKey = row.seller.id;
    const periodKey = `${row.period.start}::${row.period.end}`;
    return `${sellerKey}::${periodKey}`;
  };

  const page1Keys = page1.data.map(serializeSummaryKey);
  const page2Keys = page2.data.map(serializeSummaryKey);

  const hasOverlap = page2Keys.some((key) => page1Keys.includes(key));

  TestValidator.predicate(
    "page1 and page2 should not have overlapping summary buckets",
    hasOverlap === false,
  );

  const isPage2SortedByPeriodAsc = page2.data.every((row, index) => {
    if (index === 0) return true;
    const prev = page2.data[index - 1];
    const prevPeriod = prev.period;
    const currPeriod = row.period;
    if (prevPeriod.start < currPeriod.start) return true;
    if (prevPeriod.start > currPeriod.start) return false;
    return prevPeriod.end <= currPeriod.end;
  });

  TestValidator.predicate(
    "page2 summary rows sorted by period ascending",
    isPage2SortedByPeriodAsc,
  );

  // 8. Optionally test descending sort by netQuantityChange
  const netQuantityDescSort: IAnalyticsSort = {
    field: "netQuantityChange",
    direction: "desc",
  };

  const analyticsRequestNetDesc = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [reason.id],
    directions: ["increase"],
    group_by: ["period"],
    metrics: [
      "totalAdjustmentCount",
      "totalIncreaseQuantity",
      "totalDecreaseQuantity",
      "netQuantityChange",
    ],
    pagination: {
      page: 1,
      size: 50,
    } satisfies IAnalyticsPagination,
    sorts: [netQuantityDescSort],
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const netDescPage: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: analyticsRequestNetDesc,
      },
    );
  typia.assert(netDescPage);

  const isSortedByNetQuantityDesc = netDescPage.data.every((row, index) => {
    if (index === 0) return true;
    const prev = netDescPage.data[index - 1];
    return prev.netQuantityChange >= row.netQuantityChange;
  });

  TestValidator.predicate(
    "summary rows sorted by netQuantityChange descending",
    isSortedByNetQuantityDesc,
  );

  // 9. Request a page beyond total pages and verify appropriate behavior
  const highPage = page1Pagination.pages + 10;

  const analyticsRequestBeyond = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [reason.id],
    directions: ["increase"],
    group_by: ["period"],
    metrics: [
      "totalAdjustmentCount",
      "totalIncreaseQuantity",
      "totalDecreaseQuantity",
      "netQuantityChange",
    ],
    pagination: {
      page: highPage,
      size: 20,
    } satisfies IAnalyticsPagination,
    sorts: [periodAscSort],
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const beyondPage: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: analyticsRequestBeyond,
      },
    );
  typia.assert(beyondPage);

  const beyondPagination: IPage.IPagination = beyondPage.pagination;

  TestValidator.predicate(
    "beyond-page current should equal requested high page",
    beyondPagination.current === highPage,
  );

  TestValidator.predicate(
    "beyond-page pages should stay same as earlier",
    beyondPagination.pages === page1Pagination.pages,
  );

  TestValidator.predicate(
    "requesting a page beyond total pages should return empty data or at least not more than limit",
    beyondPage.data.length <= beyondPagination.limit,
  );
}
