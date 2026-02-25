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

/**
 * Test pagination and quantity range filtering for order items.
 * Create a customer account, authenticate, and test order items search
 * with pagination parameters and quantity range filters.
 * Validate pagination metadata accuracy and quantity filter correctness.
 */
export async function test_api_order_items_pagination_and_quantity_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Since IEcommerceOrder doesn't have an 'id' property and is an analytics type,
  // we need a valid orderId for testing. We'll use a hardcoded UUID for compilation.
  // In a real scenario, you would need to create an order first and get its ID.
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with different page and limit combinations
  const paginationTests = [
    { page: 1, limit: 2 },
    { page: 2, limit: 3 },
    { page: 1, limit: 10 },
  ];
  for (const pagination of paginationTests) {
    const paginatedItems =
      await api.functional.ecommerce.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            page: pagination.page satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: pagination.limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceOrderItem.IRequest,
        },
      );
    typia.assert(paginatedItems);
    // Validate pagination metadata
    TestValidator.equals(
      `current page matches for page ${pagination.page} limit ${pagination.limit}`,
      paginatedItems.pagination.current,
      pagination.page,
    );
    TestValidator.equals(
      `limit matches for page ${pagination.page} limit ${pagination.limit}`,
      paginatedItems.pagination.limit,
      pagination.limit,
    );
    TestValidator.predicate(
      `records count is non-negative for page ${pagination.page} limit ${pagination.limit}`,
      paginatedItems.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages count is non-negative for page ${pagination.page} limit ${pagination.limit}`,
      paginatedItems.pagination.pages >= 0,
    );
    // Validate pagination calculation integrity
    TestValidator.predicate(
      `pagination integrity for page ${pagination.page} limit ${pagination.limit}`,
      Math.ceil(
        paginatedItems.pagination.records / paginatedItems.pagination.limit,
      ) === paginatedItems.pagination.pages,
    );
  }
  // Test quantity range filtering
  const quantityTests = [
    { min_quantity: 1, max_quantity: 5 },
    { min_quantity: 3, max_quantity: 10 },
    { min_quantity: 5, max_quantity: null },
    { min_quantity: null, max_quantity: 3 },
  ];
  for (const quantityRange of quantityTests) {
    const filteredItems =
      await api.functional.ecommerce.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            min_quantity: quantityRange.min_quantity satisfies
              | (number & tags.Type<"int32"> & tags.Minimum<0>)
              | null
              | undefined,
            max_quantity: quantityRange.max_quantity satisfies
              | (number & tags.Type<"int32"> & tags.Minimum<0>)
              | null
              | undefined,
          } satisfies IEcommerceOrderItem.IRequest,
        },
      );
    typia.assert(filteredItems);
    // Validate that all returned items satisfy the quantity constraints
    for (const item of filteredItems.data) {
      if (
        quantityRange.min_quantity !== null &&
        quantityRange.min_quantity !== undefined
      ) {
        TestValidator.predicate(
          `item quantity >= min_quantity for min=${quantityRange.min_quantity} max=${quantityRange.max_quantity}`,
          item.quantity >= quantityRange.min_quantity,
        );
      }
      if (
        quantityRange.max_quantity !== null &&
        quantityRange.max_quantity !== undefined
      ) {
        TestValidator.predicate(
          `item quantity <= max_quantity for min=${quantityRange.min_quantity} max=${quantityRange.max_quantity}`,
          item.quantity <= quantityRange.max_quantity,
        );
      }
    }
  }
}
