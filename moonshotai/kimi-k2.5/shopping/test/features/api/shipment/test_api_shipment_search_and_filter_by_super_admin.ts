import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_shipment_search_and_filter_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin authentication setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Test empty filter - retrieve all shipments with default pagination
  const allShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  // Validate pagination metadata values (business constraints, not type checking)
  TestValidator.predicate(
    "pagination current page is valid",
    allShipments.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allShipments.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    allShipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    allShipments.pagination.pages >= 0,
  );
  // 3. Test filtering by status = in_transit
  const inTransitShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: "in_transit",
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(inTransitShipments);
  // Validate that in_transit filter returns only matching records (business logic verification)
  inTransitShipments.data.forEach((shipment) => {
    TestValidator.equals(
      "status is in_transit",
      shipment.deliveryStatus,
      "in_transit",
    );
  });
  // 4. Test filtering by status = delivered
  const deliveredShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: "delivered",
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipments);
  deliveredShipments.data.forEach((shipment) => {
    TestValidator.equals(
      "status is delivered",
      shipment.deliveryStatus,
      "delivered",
    );
  });
  // 5. Test filtering by date range
  const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const toDate = new Date();
  const dateRangeShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: fromDate.toISOString(),
          shippedAtTo: toDate.toISOString(),
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(dateRangeShipments);
  // 6. Test filtering by carrier name
  const carrierShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: "FedEx",
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(carrierShipments);
  // 7. Test combined filter (status + date range)
  const combinedFilterShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: "delivered",
          shippedAtFrom: fromDate.toISOString(),
          shippedAtTo: toDate.toISOString(),
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilterShipments);
  combinedFilterShipments.data.forEach((shipment) => {
    TestValidator.equals(
      "combined filter status is delivered",
      shipment.deliveryStatus,
      "delivered",
    );
  });
  // 8. Test sorting by shipped_at ascending
  const sortedAscShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: "shipped_at",
          order: "asc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedAscShipments);
  // 9. Test sorting by shipped_at descending
  const sortedDescShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: "shipped_at",
          order: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedDescShipments);
  // 10. Test sorting by created_at
  const sortedByCreatedAt =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // 11. Test sorting by carrier_name
  const sortedByCarrierName =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: "carrier_name",
          order: "asc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedByCarrierName);
  // 12. Test pagination with custom limit
  const paginatedShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 10,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(paginatedShipments);
  TestValidator.predicate(
    "page 1 returns at most limit items",
    paginatedShipments.data.length <= 10,
  );
  // 13. Test search functionality
  const searchShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: RandomGenerator.alphabets(3),
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(searchShipments);
}
