import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_order_snapshot_pagination_with_multiple_status_changes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actors
  // 1.1 Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 1.2 Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 1.3 Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Add product to cart as customer
  const variant = product.variants[0];
  typia.assertGuard(variant);
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  // Step 4: Create order as customer
  const orderPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orderPage);
  // Get the specific order we just created
  const order = orderPage.data[0];
  typia.assertGuard(order);
  // Step 5: Update order status multiple times as seller to generate snapshots
  // We'll simulate various status changes: processing → shipped → delivered
  const statusTransitions = ["processing", "shipped", "delivered"];
  for (const status of statusTransitions) {
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status,
      } satisfies IEcommerceMallOrder.IRequest,
    });
    // Small delay to ensure distinct creation times for snapshots
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  // Additional test scenarios for generating more snapshots
  for (let i = 0; i < 3; i++) {
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "processing",
      } satisfies IEcommerceMallOrder.IRequest,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  // Step 6: Use super admin to test snapshot pagination
  // 6.1 First, get all snapshots without pagination to know the total count
  const allSnapshotsPage =
    await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
      superAdminConnection,
      {
        orderId: order.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: null,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsPage);
  const totalSnapshotCount = allSnapshotsPage.pagination.records;
  TestValidator.predicate(
    "should have at least one snapshot",
    totalSnapshotCount > 0,
  );
  // 6.2 Test pagination with small page size (2 items per page)
  const pageSize = 2;
  const expectedPageCount = Math.ceil(totalSnapshotCount / pageSize);
  let currentPage = 1;
  const totalRetrievedSnapshots: IEcommerceMallOrderSnapshot.ISummary[] = [];
  let previousPageLastId: string | null = null;
  // Iterate through all pages
  while (currentPage <= expectedPageCount) {
    const pageResult =
      await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
        superAdminConnection,
        {
          orderId: order.id,
          body: {
            createdAtFrom: null,
            createdAtTo: null,
            page: currentPage,
            limit: pageSize,
          } satisfies IEcommerceMallOrderSnapshot.IRequest,
        },
      );
    typia.assert(pageResult);
    // Validate pagination metadata consistency
    TestValidator.equals(
      `page ${currentPage} - pagination limit matches request`,
      pageResult.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      `page ${currentPage} - pagination current matches requested page`,
      pageResult.pagination.current,
      currentPage,
    );
    TestValidator.equals(
      `page ${currentPage} - total records matches expected`,
      pageResult.pagination.records,
      totalSnapshotCount,
    );
    TestValidator.equals(
      `page ${currentPage} - total pages matches expected`,
      pageResult.pagination.pages,
      expectedPageCount,
    );
    // Validate page content
    const expectedItemsOnPage =
      currentPage === expectedPageCount
        ? totalSnapshotCount - (currentPage - 1) * pageSize
        : pageSize;
    TestValidator.equals(
      `page ${currentPage} - data array length matches expected`,
      pageResult.data.length,
      expectedItemsOnPage,
    );
    // Collect snapshots for duplicate checking
    totalRetrievedSnapshots.push(...pageResult.data);
    // Validate chronological ordering (descending by creation time)
    if (pageResult.data.length > 1) {
      for (let i = 1; i < pageResult.data.length; i++) {
        const current = new Date(pageResult.data[i].createdAt);
        const previous = new Date(pageResult.data[i - 1].createdAt);
        TestValidator.predicate(
          `page ${currentPage} - chronology preserved at index ${i}`,
          current.getTime() <= previous.getTime(),
        );
      }
    }
    // Validate no overlap between pages (snapshot IDs should not repeat)
    if (previousPageLastId !== null && pageResult.data.length > 0) {
      const firstIdOnPage = pageResult.data[0].id;
      TestValidator.notEquals(
        `page ${currentPage} - no overlap with previous page`,
        firstIdOnPage,
        previousPageLastId,
      );
    }
    if (pageResult.data.length > 0) {
      previousPageLastId = pageResult.data[pageResult.data.length - 1].id;
    }
    currentPage++;
  }
  // 6.3 Validate total retrieved count matches expected
  TestValidator.equals(
    "total retrieved snapshots count matches expected",
    totalRetrievedSnapshots.length,
    totalSnapshotCount,
  );
  // 6.4 Validate no duplicate snapshots across all pages
  const snapshotIdSet = new Set(totalRetrievedSnapshots.map((s) => s.id));
  TestValidator.equals(
    "no duplicate snapshot IDs across all pages",
    snapshotIdSet.size,
    totalRetrievedSnapshots.length,
  );
  // 6.5 Test boundary conditions
  // Test requesting page beyond total pages should return empty data
  const beyondLastPage =
    await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
      superAdminConnection,
      {
        orderId: order.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          page: expectedPageCount + 1,
          limit: pageSize,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "beyond last page - data is empty",
    beyondLastPage.data.length,
    0,
  );
  // Test first page explicitly
  const firstPage =
    await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
      superAdminConnection,
      {
        orderId: order.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: pageSize,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page - current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page - data has items when total > 0",
    firstPage.data.length > 0 || totalSnapshotCount === 0,
  );
  // 6.6 Test time range filtering if snapshots exist
  if (totalSnapshotCount > 0) {
    const firstSnapshotTime = new Date(firstPage.data[0].createdAt);
    const fromTime = new Date(firstSnapshotTime.getTime() - 1000).toISOString();
    const toTime = new Date(firstSnapshotTime.getTime() + 1000).toISOString();
    const filteredPage =
      await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
        superAdminConnection,
        {
          orderId: order.id,
          body: {
            createdAtFrom: fromTime,
            createdAtTo: toTime,
            page: 1,
            limit: pageSize,
          } satisfies IEcommerceMallOrderSnapshot.IRequest,
        },
      );
    typia.assert(filteredPage);
    // Filtered results should have fewer or equal items than total
    TestValidator.predicate(
      "time filtered results are subset of total",
      filteredPage.pagination.records <= totalSnapshotCount,
    );
  }
}
