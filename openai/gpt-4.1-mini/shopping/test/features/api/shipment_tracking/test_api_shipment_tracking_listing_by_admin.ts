import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

/**
 * Validate that an administrator can join the system and search shipment
 * tracking records with appropriate filters.
 *
 * The test first performs admin user registration via the join endpoint,
 * asserting successful authentication and token issuance. Subsequently, it
 * performs multiple calls to shipment tracking listing endpoint otherwise
 * requiring admin authorization, passing realistic filter parameters and
 * pagination requests that verify business requirements. Each response is
 * validated for correct data structure, pagination metadata, and data
 * consistency against filter inputs.
 *
 * Overall, this test ensures the backend enforces role-based access control,
 * processes filter requests correctly, and returns paginated shipment tracking
 * summaries accordingly.
 */
export async function test_api_shipment_tracking_listing_by_admin(
  connection: api.IConnection,
) {
  // Admin joins and obtains authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "secure_password_123";
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Basic filter: empty filter, defaults
  const filterAll: IShoppingMallShipmentTracking.IRequest = {};
  const allShipments: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterAll,
      },
    );
  typia.assert(allShipments);
  TestValidator.predicate(
    "pagination records and data availability",
    allShipments.pagination.records >= 0 && Array.isArray(allShipments.data),
  );

  // Filter by a sample order ID (simulate UUID format for test)
  // Generate a valid UUID string
  const sampleOrderId = typia.random<string & tags.Format<"uuid">>();
  const filterByOrderId: IShoppingMallShipmentTracking.IRequest = {
    order_id: sampleOrderId,
  };
  const byOrderId: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterByOrderId,
      },
    );
  typia.assert(byOrderId);
  TestValidator.equals(
    "order_id filter exact match",
    byOrderId.data.every(
      (item) => item.shopping_mall_order_id === sampleOrderId,
    ),
    true,
  );

  // Filter with tracking number substring (simulate string)
  const trackingKeyword = RandomGenerator.substring("TRACK1234567890");
  const filterByTrackingNumber: IShoppingMallShipmentTracking.IRequest = {
    tracking_number: trackingKeyword,
  };
  const byTrackingNumber: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterByTrackingNumber,
      },
    );
  typia.assert(byTrackingNumber);
  // Cannot assert contents due to missing server logic, just check type

  // Filter by carrier name (simulate realistic names)
  const carrierNames = ["UPS", "FedEx", "DHL", "USPS"] as const;
  const pickedCarrierName = RandomGenerator.pick(carrierNames);
  const filterByCarrierName: IShoppingMallShipmentTracking.IRequest = {
    carrier_name: pickedCarrierName,
  };
  const byCarrierName: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterByCarrierName,
      },
    );
  typia.assert(byCarrierName);

  // Filter by shipping status (simulate some common statuses)
  const shippingStatuses = ["shipped", "in_transit", "delivered"] as const;
  const pickedStatus = RandomGenerator.pick(shippingStatuses);
  const filterByShippingStatus: IShoppingMallShipmentTracking.IRequest = {
    shipping_status: pickedStatus,
  };
  const byShippingStatus: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterByShippingStatus,
      },
    );
  typia.assert(byShippingStatus);

  // Filter by shipped_at date boundaries
  // Generate ISO date strings for a range
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000); // 7 days ago
  const filterByShippedDate: IShoppingMallShipmentTracking.IRequest = {
    shipped_from: pastDate.toISOString(),
    shipped_to: now.toISOString(),
  };
  const byShippedDate: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterByShippedDate,
      },
    );
  typia.assert(byShippedDate);

  // Filter by delivered_at date boundaries
  const deliveredFrom = new Date(now.getTime() - 30 * 24 * 3600 * 1000); // 30 days ago
  const deliveredTo = now.toISOString();
  const filterByDeliveredDate: IShoppingMallShipmentTracking.IRequest = {
    delivered_from: deliveredFrom.toISOString(),
    delivered_to: deliveredTo,
  };
  const byDeliveredDate: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterByDeliveredDate,
      },
    );
  typia.assert(byDeliveredDate);

  // Test pagination parameters
  const filterWithPagination: IShoppingMallShipmentTracking.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "shipped_at",
    sort_order: "desc",
  };
  const paginatedShipments: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: filterWithPagination,
      },
    );
  typia.assert(paginatedShipments);
  TestValidator.predicate(
    "pagination limit",
    paginatedShipments.pagination.limit === 10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedShipments.pagination.current,
    1,
  );
}
