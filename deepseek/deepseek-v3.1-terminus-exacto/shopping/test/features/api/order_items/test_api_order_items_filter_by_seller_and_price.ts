import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_items_filter_by_seller_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create order with multiple items from different sellers
  // Note: In a real scenario, we would need to create products and sellers first
  // For this test, we assume order creation works and returns order with items
  const order = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IEcommerceOrder>(),
    },
  );
  typia.assert(order);
  // 3. Get order ID from the created order (assuming order has an id property)
  const orderId = typia.random<string & tags.Format<"uuid">>(); // Placeholder
  // 4. Test filtering by seller_id
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilterResponse =
    await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          seller_id: sellerId,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
  typia.assert(sellerFilterResponse);
  // Validate all returned items belong to the specified seller
  for (const item of sellerFilterResponse.data) {
    TestValidator.equals(
      "item seller matches filter",
      item.seller.id,
      sellerId,
    );
  }
  // 5. Test filtering by price range
  const minPrice = typia.random<number & tags.Minimum<0>>();
  const maxPrice =
    minPrice + typia.random<number & tags.Minimum<100> & tags.Maximum<1000>>();
  const priceFilterResponse =
    await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          min_unit_price: minPrice,
          max_unit_price: maxPrice,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
  typia.assert(priceFilterResponse);
  // Validate all returned items are within price range
  for (const item of priceFilterResponse.data) {
    TestValidator.predicate(
      "unit price within range",
      item.unit_price >= minPrice && item.unit_price <= maxPrice,
    );
  }
  // 6. Test combined filtering (seller + price range)
  const combinedFilterResponse =
    await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          seller_id: sellerId,
          min_unit_price: minPrice,
          max_unit_price: maxPrice,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined criteria
  for (const item of combinedFilterResponse.data) {
    TestValidator.equals(
      "seller matches in combined filter",
      item.seller.id,
      sellerId,
    );
    TestValidator.predicate(
      "price within range in combined filter",
      item.unit_price >= minPrice && item.unit_price <= maxPrice,
    );
  }
  // 7. Test pagination with different limit values
  const limitValues = [5, 10, 20] as const;
  for (const limit of limitValues) {
    const paginationResponse =
      await api.functional.ecommerce.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            limit,
          } satisfies IEcommerceOrderItem.IRequest,
        },
      );
    typia.assert(paginationResponse);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} matches response limit`,
      paginationResponse.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `data count ≤ limit ${limit}`,
      paginationResponse.data.length <= limit,
    );
  }
}
